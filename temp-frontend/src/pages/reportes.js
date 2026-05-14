/**
 * Reportes - Analisis Pedagogico (datos reales)
 *
 * Escala 1-5: Inicial · En desarrollo · Intermedio · Logrado · Avanzado
 *
 * Filtros en cascada:
 *   Periodo -> Materia -> Centro educativo -> Seccion -> Estudiante
 *   Cada filtro es opcional; "Todas" mantiene la vista general.
 */

import Chart from 'chart.js/auto'
import {
  getAnioLectivoActivo,
  getMaterias,
  getPeriodos,
  getSecciones,
  filtrarSeccionesPropias,
  filtrarMateriasPropias,
  getPromediosSeccionSaber,
  getAlertasTematicasSeccion,
} from '../api.js'

const TIPO_COLORS = { 1: '#7c3aed', 2: '#0891b2', 3: '#d97706' }
const NIVEL_COLOR = { ALTA: '#dc2626', MEDIA: '#d97706', SIN_ALERTA: '#16a34a' }
const SCALE_LABELS = ['', 'Inicial', 'En desarrollo', 'Intermedio', 'Logrado', 'Avanzado']
const REPORT_MATERIAS = ['ESPANOL', 'MATEMATICAS', 'CIENCIAS', 'ESTUDIOS_SOCIALES']

function colorFromVal(v) {
  if (v === null || v === undefined) return '#e5e7eb'
  if (v <= 2.0) return NIVEL_COLOR.ALTA
  if (v <= 3.0) return NIVEL_COLOR.MEDIA
  return NIVEL_COLOR.SIN_ALERTA
}

const _charts = {}
function destroyChart(id) { _charts[id]?.destroy(); delete _charts[id] }
function destroyAll() { Object.keys(_charts).forEach(destroyChart) }

const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { font: { size: 11 }, boxWidth: 12 } },
    tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label ?? ''}: ${Number(ctx.raw).toFixed(2)}` } },
  },
}

const SCALE_Y_1_5 = {
  y: {
    min: 0,
    max: 5,
    ticks: { stepSize: 1, callback: v => SCALE_LABELS[v] ?? v },
    grid: { color: '#f3f4f6' },
  },
  x: { grid: { display: false } },
}

function makeChart(id, type, data, extra = {}) {
  destroyChart(id)
  const canvas = document.getElementById(id)
  if (!canvas) return
  _charts[id] = new Chart(canvas, { type, data, options: { ...BASE_OPTS, ...extra } })
}

export async function renderReportes(container) {
  container.innerHTML = `
    <h1>Reportes - Analisis Pedagogico</h1>
    <p class="page-desc">
      Estadisticas y tendencias por seccion y periodo. Escala 1-5 (Inicial -> Avanzado).
      "Todas" muestra el reporte general y una materia seleccionada recalcula todo el analisis solo para esa asignatura.
    </p>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="min-width:165px;margin-bottom:0">
          <label>Periodo</label>
          <select id="sel-periodo" disabled><option value="">Cargando...</option></select>
        </div>
        <div class="form-group" style="min-width:165px;margin-bottom:0">
          <label>Materia</label>
          <select id="sel-materia" disabled>
            <option value="">Todas</option>
          </select>
        </div>
        <div class="form-group" style="min-width:185px;margin-bottom:0">
          <label>Centro educativo</label>
          <select id="sel-centro" disabled>
            <option value="">- Todos los centros -</option>
          </select>
        </div>
        <div class="form-group" style="min-width:185px;margin-bottom:0">
          <label>Seccion</label>
          <select id="sel-seccion" disabled>
            <option value="">- Todas las secciones -</option>
          </select>
        </div>
        <div class="form-group" style="min-width:185px;margin-bottom:0">
          <label>Estudiante</label>
          <select id="sel-estudiante" disabled>
            <option value="">- Todos los estudiantes -</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card" style="padding:12px 18px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Tipo de grafico:</span>
        <div id="chart-type-btns" style="display:flex;gap:6px;flex-wrap:wrap">
          ${[
            { type: 'bar', icon: '▦', label: 'Barras' },
            { type: 'radar', icon: '◈', label: 'Radar' },
            { type: 'doughnut', icon: '◎', label: 'Dona' },
            { type: 'line', icon: '∿', label: 'Linea' },
            { type: 'polarArea', icon: '◉', label: 'Polar' },
          ].map(b => `
            <button class="chart-type-btn${b.type === 'bar' ? ' active' : ''}" data-type="${b.type}"
              style="display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:6px;
                border:1px solid var(--border);background:var(--surface);color:var(--text-muted);
                font-size:12px;font-weight:500;cursor:pointer;transition:all .15s">
              ${b.icon} ${b.label}
            </button>`).join('')}
        </div>
      </div>
    </div>

    <div id="rpt-body">
      <div style="text-align:center;padding:60px;color:var(--text-muted)">
        ⏳ Cargando datos...
      </div>
    </div>

    <style>
      .chart-type-btn:hover { border-color:var(--accent)!important;color:var(--accent)!important }
      .chart-type-btn.active { background:var(--accent)!important;color:#fff!important;border-color:var(--accent)!important }
      .rpt-row { display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px }
      @media(max-width:640px){ .rpt-row { grid-template-columns:1fr } }
    </style>
  `

  const selPeriodo = container.querySelector('#sel-periodo')
  const selMateria = container.querySelector('#sel-materia')
  const selCentro = container.querySelector('#sel-centro')
  const selSeccion = container.querySelector('#sel-seccion')
  const selEstudiante = container.querySelector('#sel-estudiante')
  const rptBody = container.querySelector('#rpt-body')

  let chartType = 'bar'
  let periodos = []
  let secciones = []
  let materias = []

  let promediosCargados = []
  let alertasCargadas = []
  let promediosMateria = []
  let alertasMateria = []
  let promediosActivos = []
  let alertasActivas = []

  try {
    const anio = await getAnioLectivoActivo()
    let seccionesRaw
    ;[periodos, seccionesRaw, materias] = await Promise.all([
      getPeriodos(anio.id),
      getSecciones(anio.id),
      getMaterias(),
    ])
    secciones = await filtrarSeccionesPropias(seccionesRaw)
    materias = await filtrarMateriasPropias(materias)

    selPeriodo.innerHTML = '<option value="">- Todos los periodos -</option>' +
      periodos.map(p => `<option value="${p.id}">${p.nombre}${p.activo ? ' *' : ''}</option>`).join('')
    selPeriodo.disabled = false

    const materiasFiltradas = materias
      .filter(m => REPORT_MATERIAS.includes(m.clave))
      .sort((a, b) => REPORT_MATERIAS.indexOf(a.clave) - REPORT_MATERIAS.indexOf(b.clave))
    selMateria.innerHTML = '<option value="">Todas</option>' +
      materiasFiltradas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('')
    selMateria.disabled = false

    const centros = [...new Set(secciones.map(s => s.centroNombre).filter(Boolean))].sort()
    selCentro.innerHTML = '<option value="">- Todos los centros -</option>' +
      centros.map(c => `<option value="${c}">${c}</option>`).join('')
    selCentro.disabled = false

    repoblarSecciones()
    selSeccion.disabled = false

    const activo = periodos.find(p => p.activo)
    if (activo) selPeriodo.value = activo.id
    await cargar()
  } catch (e) {
    rptBody.innerHTML = `<div class="card" style="color:#dc2626">Error al cargar catalogos: ${e.message}</div>`
    return
  }

  selPeriodo.addEventListener('change', async () => {
    resetFiltros('centro')
    await cargar()
  })

  selMateria.addEventListener('change', () => {
    aplicarFiltroMateria()
  })

  selCentro.addEventListener('change', async () => {
    resetFiltros('seccion')
    repoblarSecciones()
    await cargar()
  })

  selSeccion.addEventListener('change', async () => {
    resetFiltros('estudiante')
    await cargar()
  })

  selEstudiante.addEventListener('change', () => {
    aplicarFiltroEstudiante()
  })

  container.querySelector('#chart-type-btns').addEventListener('click', e => {
    const btn = e.target.closest('.chart-type-btn')
    if (!btn) return
    chartType = btn.dataset.type
    container.querySelectorAll('.chart-type-btn').forEach(b => b.classList.toggle('active', b === btn))
    if (promediosActivos.length) renderGraficos(promediosActivos, alertasActivas)
  })

  function resetFiltros(desde) {
    const niveles = ['centro', 'seccion', 'estudiante']
    const idx = niveles.indexOf(desde)
    if (idx <= 0 && desde === 'centro') selCentro.value = ''
    if (idx <= 1) { selSeccion.value = ''; repoblarSecciones() }
    if (idx <= 2) selEstudiante.value = ''
  }

  function repoblarSecciones() {
    const centroFiltro = selCentro.value
    const filtradas = centroFiltro
      ? secciones.filter(s => s.centroNombre === centroFiltro)
      : secciones
    const prev = selSeccion.value
    selSeccion.innerHTML = '<option value="">- Todas las secciones -</option>' +
      filtradas.map(s =>
        `<option value="${s.id}">${s.nivelGrado ? s.nivelGrado + '° - ' : ''}${s.nombre}${s.docenteNombreCompleto ? ' (' + s.docenteNombreCompleto + ')' : ''}</option>`
      ).join('')
    if (prev && filtradas.some(s => String(s.id) === prev)) selSeccion.value = prev
  }

  function repoblarEstudiantes(promedios) {
    const prev = selEstudiante.value
    const sorted = [...promedios].sort((a, b) =>
      a.estudianteNombreCompleto.localeCompare(b.estudianteNombreCompleto))
    selEstudiante.innerHTML = '<option value="">- Todos los estudiantes -</option>' +
      sorted.map(p => `<option value="${p.estudianteId}">${p.estudianteNombreCompleto}</option>`).join('')
    selEstudiante.disabled = promedios.length === 0
    if (prev && sorted.some(p => String(p.estudianteId) === prev)) selEstudiante.value = prev
  }

  function aplicarFiltroMateria() {
    const materiaId = Number(selMateria.value)
    promediosMateria = filtrarPromediosPorMateria(promediosCargados, materiaId)
    alertasMateria = filtrarAlertasPorMateria(alertasCargadas, materiaId)
    repoblarEstudiantes(promediosMateria)
    aplicarFiltroEstudiante()
  }

  function aplicarFiltroEstudiante() {
    const estudianteId = Number(selEstudiante.value)
    promediosActivos = estudianteId
      ? promediosMateria.filter(p => p.estudianteId === estudianteId)
      : promediosMateria
    alertasActivas = estudianteId
      ? alertasMateria.filter(a => a.estudianteId === estudianteId)
      : alertasMateria

    if (!promediosActivos.length) {
      destroyAll()
      rptBody.innerHTML = vacioHtml(mensajeSinDatosActual())
      return
    }

    renderGraficos(promediosActivos, alertasActivas)
  }

  async function cargar() {
    const periodoId = Number(selPeriodo.value)
    if (!periodoId) {
      destroyAll()
      rptBody.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted)">
        Seleccione un periodo para ver los reportes.
      </div>`
      return
    }

    const centroFiltro = selCentro.value
    const seccionId = Number(selSeccion.value)
    let seccionesCarga = secciones
    if (centroFiltro) seccionesCarga = seccionesCarga.filter(s => s.centroNombre === centroFiltro)
    if (seccionId) seccionesCarga = seccionesCarga.filter(s => s.id === seccionId)

    if (!seccionesCarga.length) {
      destroyAll()
      rptBody.innerHTML = vacioHtml('No hay secciones para los filtros seleccionados.')
      return
    }

    rptBody.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted)">⏳ Calculando reportes...</div>`
    destroyAll()

    try {
      const resultados = await Promise.all(
        seccionesCarga.map(s => Promise.all([
          getPromediosSeccionSaber(s.id, periodoId).catch(() => []),
          getAlertasTematicasSeccion(s.id, periodoId).catch(() => []),
        ]))
      )

      promediosCargados = resultados.flatMap(([p]) => p)
      alertasCargadas = resultados.flatMap(([, a]) => a)
      aplicarFiltroMateria()
    } catch (e) {
      rptBody.innerHTML = `<div class="card" style="color:#dc2626">Error: ${e.message}</div>`
    }
  }

  function renderGraficos(promedios, alertas) {
    const ejeMap = new Map()
    const tipoMap = new Map()

    for (const est of promedios) {
      for (const ts of est.promediosPorTipoSaber || []) {
        tipoMap.set(ts.tipoSaberId, ts.tipoSaberNombre)
        for (const eje of ts.promediosPorEje || []) {
          const key = eje.ejeTemaaticoId
          if (!ejeMap.has(key)) {
            ejeMap.set(key, {
              id: key,
              nombre: eje.ejeNombre,
              clave: eje.ejeClave,
              tipoId: ts.tipoSaberId,
              tipoNombre: ts.tipoSaberNombre,
              vals: [],
            })
          }
          if (eje.promedio !== null) ejeMap.get(key).vals.push(parseFloat(eje.promedio))
        }
      }
    }

    const ejes = [...ejeMap.values()]
      .map(e => ({ ...e, avg: e.vals.length ? e.vals.reduce((a, b) => a + b, 0) / e.vals.length : null }))
      .sort((a, b) => a.tipoId - b.tipoId || a.id - b.id)

    const tipoAvgs = {}
    for (const [tipoId, nombre] of tipoMap) {
      const vals = ejes.filter(e => e.tipoId === tipoId && e.avg !== null).map(e => e.avg)
      tipoAvgs[tipoId] = {
        nombre,
        avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      }
    }

    const nAlta = alertas.filter(a => a.nivelAlerta === 'ALTA').length
    const nMedia = alertas.filter(a => a.nivelAlerta === 'MEDIA').length
    const totalEst = promedios.length

    const alcanceBase = selEstudiante.value
      ? selEstudiante.options[selEstudiante.selectedIndex]?.text
      : selSeccion.value
        ? selSeccion.options[selSeccion.selectedIndex]?.text
        : selCentro.value || 'Todos los centros'
    const alcance = `${alcanceBase} · ${nombreMateriaActual()}`

    rptBody.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px">
        ${[
          { val: totalEst, label: 'Estudiantes evaluados', col: 'var(--primary)', bg: '#eff6ff' },
          { val: ejes.length, label: 'Ejes evaluados', col: '#7c3aed', bg: '#faf5ff' },
          { val: nAlta, label: 'Alertas altas', col: '#dc2626', bg: '#fee2e2' },
          { val: nMedia, label: 'Alertas medias', col: '#d97706', bg: '#fef9c3' },
          { val: promGlobal(promedios), label: 'Promedio global', col: '#16a34a', bg: '#dcfce7' },
        ].map(k => `
          <div style="padding:10px 14px;border-radius:10px;background:${k.bg};border:1px solid ${k.col}25">
            <div style="font-size:22px;font-weight:900;color:${k.col};line-height:1">${typeof k.val === 'number' && !Number.isInteger(k.val) ? k.val.toFixed(2) : k.val}</div>
            <div style="font-size:11px;font-weight:600;color:${k.col};margin-top:2px">${k.label}</div>
          </div>`).join('')}
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin:-8px 0 14px">Alcance: <strong>${alcance}</strong></p>

      <div class="rpt-row">
        <div class="card" style="margin:0">
          <h2 style="margin-top:0;font-size:14px">Promedios por eje tematico</h2>
          <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Promedio del grupo - color por nivel de alerta</p>
          <div style="position:relative;height:260px"><canvas id="chart-ejes"></canvas></div>
        </div>
        <div class="card" style="margin:0">
          <h2 style="margin-top:0;font-size:14px">Tipos de saber</h2>
          <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Promedio grupal por componente curricular</p>
          <div style="position:relative;height:260px"><canvas id="chart-tipo"></canvas></div>
        </div>
      </div>

      <div class="rpt-row">
        <div class="card" style="margin:0">
          <h2 style="margin-top:0;font-size:14px">Promedio por estudiante</h2>
          <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Promedio global en el periodo</p>
          <div style="position:relative;height:260px"><canvas id="chart-estudiantes"></canvas></div>
        </div>
        <div class="card" style="margin:0">
          <h2 style="margin-top:0;font-size:14px">Distribucion de alertas</h2>
          <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Cantidad de ejes por nivel</p>
          <div style="position:relative;height:260px"><canvas id="chart-alertas"></canvas></div>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0;font-size:14px">Estudiantes con mas alertas</h2>
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Suma de alertas altas y medias</p>
        <div style="position:relative;height:${Math.max(160, totalEst * 32)}px"><canvas id="chart-ranking"></canvas></div>
      </div>

      <div class="card">
        <h2 style="margin-top:0;font-size:14px">Analisis automatico</h2>
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Conclusiones derivadas de los patrones detectados.</p>
        <div id="insights-list"></div>
      </div>
    `

    const ejeLabels = ejes.map(e => abrev(e.nombre))
    const ejeData = ejes.map(e => e.avg ?? 0)
    const ejeBgCol = ejes.map(e => colorFromVal(e.avg))

    if (chartType === 'radar') {
      makeChart('chart-ejes', 'radar', {
        labels: ejeLabels,
        datasets: [{ label: 'Promedio', data: ejeData, backgroundColor: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6', pointBackgroundColor: ejeBgCol }],
      }, { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, callback: v => SCALE_LABELS[v] ?? v }, grid: { color: '#e5e7eb' } } } })
    } else if (chartType === 'doughnut' || chartType === 'polarArea') {
      makeChart('chart-ejes', chartType, {
        labels: ejeLabels,
        datasets: [{ data: ejeData, backgroundColor: ejeBgCol.map(c => c + 'cc'), borderWidth: 1 }],
      }, chartType === 'polarArea'
        ? { scales: { r: { min: 0, max: 5 } } }
        : { plugins: { ...BASE_OPTS.plugins, legend: { position: 'right', labels: { font: { size: 10 } } } } })
    } else {
      makeChart('chart-ejes', chartType === 'line' ? 'line' : 'bar', {
        labels: ejeLabels,
        datasets: [{
          label: 'Promedio',
          data: ejeData,
          backgroundColor: chartType === 'line' ? 'rgba(59,130,246,0.1)' : ejeBgCol,
          borderColor: chartType === 'line' ? '#3b82f6' : ejeBgCol,
          borderRadius: 4,
          fill: chartType === 'line',
          tension: 0.3,
          pointBackgroundColor: ejeBgCol,
        }],
      }, { scales: SCALE_Y_1_5 })
    }

    const tipoLabels = Object.values(tipoAvgs).map(t => t.nombre.replace('Saber ', ''))
    const tipoData = Object.values(tipoAvgs).map(t => t.avg ?? 0)
    const tipoCols = Object.keys(tipoAvgs).map(id => TIPO_COLORS[id] || '#6b7280')

    if (chartType === 'radar') {
      makeChart('chart-tipo', 'radar', {
        labels: tipoLabels,
        datasets: [{ label: 'Promedio', data: tipoData, backgroundColor: 'rgba(5,150,105,0.15)', borderColor: '#059669', pointBackgroundColor: tipoCols }],
      }, { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: '#e5e7eb' } } } })
    } else if (chartType === 'doughnut' || chartType === 'polarArea') {
      makeChart('chart-tipo', chartType, {
        labels: tipoLabels,
        datasets: [{ data: tipoData, backgroundColor: tipoCols.map(c => c + 'cc'), borderWidth: 1 }],
      }, chartType === 'polarArea'
        ? { scales: { r: { min: 0, max: 5 } } }
        : { plugins: { ...BASE_OPTS.plugins, legend: { position: 'right' } } })
    } else {
      makeChart('chart-tipo', chartType === 'line' ? 'line' : 'bar', {
        labels: tipoLabels,
        datasets: [{
          label: 'Promedio',
          data: tipoData,
          backgroundColor: tipoCols,
          borderColor: tipoCols,
          borderRadius: 4,
          fill: chartType === 'line',
          tension: 0.4,
        }],
      }, { scales: SCALE_Y_1_5 })
    }

    const estSorted = [...promedios].sort((a, b) => parseFloat(a.promedioGlobal ?? 0) - parseFloat(b.promedioGlobal ?? 0))
    const estLabels = estSorted.map(e => nombreCorto(e.estudianteNombreCompleto))
    const estData   = estSorted.map(e => parseFloat(e.promedioGlobal ?? 0))
    const estCols   = estSorted.map(e => colorFromVal(parseFloat(e.promedioGlobal)))

    if (chartType === 'radar') {
      makeChart('chart-estudiantes', 'radar', {
        labels: estLabels,
        datasets: [{ label: 'Promedio global', data: estData, backgroundColor: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6', pointBackgroundColor: estCols }],
      }, { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, callback: v => SCALE_LABELS[v] ?? v }, grid: { color: '#e5e7eb' } } } })
    } else if (chartType === 'doughnut' || chartType === 'polarArea') {
      makeChart('chart-estudiantes', chartType, {
        labels: estLabels,
        datasets: [{ data: estData, backgroundColor: estCols.map(c => c + 'cc'), borderWidth: 1 }],
      }, chartType === 'polarArea'
        ? { scales: { r: { min: 0, max: 5 } } }
        : { plugins: { ...BASE_OPTS.plugins, legend: { position: 'right', labels: { font: { size: 10 } } } } })
    } else if (chartType === 'line') {
      makeChart('chart-estudiantes', 'line', {
        labels: estLabels,
        datasets: [{ label: 'Promedio global', data: estData, backgroundColor: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6', pointBackgroundColor: estCols, fill: true, tension: 0.3 }],
      }, { scales: { y: { min: 0, max: 5, ticks: { callback: v => SCALE_LABELS[v] ?? v }, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } } })
    } else {
      makeChart('chart-estudiantes', 'bar', {
        labels: estLabels,
        datasets: [{ label: 'Promedio global', data: estData, backgroundColor: estCols, borderRadius: 4 }],
      }, { indexAxis: 'y', scales: { x: { min: 0, max: 5, ticks: { callback: v => SCALE_LABELS[v] ?? v }, grid: { color: '#f3f4f6' } }, y: { grid: { display: false } } } })
    }

    const distData = [nAlta, nMedia, Math.max(0, ejes.length * totalEst - nAlta - nMedia)]
    const distLabels = ['Alta', 'Media', 'Sin alerta']
    const distCols = [NIVEL_COLOR.ALTA, NIVEL_COLOR.MEDIA, NIVEL_COLOR.SIN_ALERTA]

    if (chartType === 'radar') {
      makeChart('chart-alertas', 'radar', {
        labels: distLabels,
        datasets: [{ label: 'Cantidad', data: distData, backgroundColor: 'rgba(220,38,38,0.1)', borderColor: '#ef4444', pointBackgroundColor: distCols }],
      }, { scales: { r: { ticks: { stepSize: 1 }, grid: { color: '#e5e7eb' } } } })
    } else if (chartType === 'bar' || chartType === 'line') {
      makeChart('chart-alertas', chartType, {
        labels: distLabels,
        datasets: [{ label: 'Ejes', data: distData, backgroundColor: distCols, borderColor: distCols, borderRadius: 4, fill: chartType === 'line', tension: 0.3 }],
      }, { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } } })
    } else {
      makeChart('chart-alertas', chartType === 'polarArea' ? 'polarArea' : 'doughnut', {
        labels: distLabels,
        datasets: [{ data: distData, backgroundColor: distCols.map(c => c + 'cc'), borderWidth: 1 }],
      }, chartType === 'polarArea' ? {} : { plugins: { ...BASE_OPTS.plugins, legend: { position: 'right' } } })
    }

    const rankSorted = [...promedios]
      .map(e => ({ nombre: nombreCorto(e.estudianteNombreCompleto), altas: e.totalAlertasAltas || 0, medias: e.totalAlertasMedias || 0 }))
      .filter(e => e.altas + e.medias > 0)
      .sort((a, b) => (b.altas + b.medias) - (a.altas + a.medias))

    if (!rankSorted.length) {
      document.getElementById('chart-ranking').parentElement.innerHTML =
        '<p class="empty" style="padding:24px 0">No se detectaron alertas.</p>'
    } else {
      const rankLabels = rankSorted.map(e => e.nombre)
      const rankAltas  = rankSorted.map(e => e.altas)
      const rankMedias = rankSorted.map(e => e.medias)
      const rankTotal  = rankSorted.map(e => e.altas + e.medias)

      if (chartType === 'radar') {
        makeChart('chart-ranking', 'radar', {
          labels: rankLabels,
          datasets: [
            { label: 'Alertas altas',  data: rankAltas,  backgroundColor: 'rgba(220,38,38,0.1)',  borderColor: NIVEL_COLOR.ALTA,  pointBackgroundColor: NIVEL_COLOR.ALTA  },
            { label: 'Alertas medias', data: rankMedias, backgroundColor: 'rgba(217,119,6,0.1)', borderColor: NIVEL_COLOR.MEDIA, pointBackgroundColor: NIVEL_COLOR.MEDIA },
          ],
        }, { scales: { r: { ticks: { stepSize: 1 }, grid: { color: '#e5e7eb' } } } })
      } else if (chartType === 'doughnut' || chartType === 'polarArea') {
        makeChart('chart-ranking', chartType, {
          labels: rankLabels,
          datasets: [{ data: rankTotal, backgroundColor: rankSorted.map(() => NIVEL_COLOR.ALTA + 'cc'), borderWidth: 1 }],
        }, chartType === 'polarArea'
          ? {}
          : { plugins: { ...BASE_OPTS.plugins, legend: { position: 'right', labels: { font: { size: 10 } } } } })
      } else if (chartType === 'line') {
        makeChart('chart-ranking', 'line', {
          labels: rankLabels,
          datasets: [
            { label: 'Alertas altas',  data: rankAltas,  backgroundColor: 'rgba(220,38,38,0.1)',  borderColor: NIVEL_COLOR.ALTA,  fill: true, tension: 0.3 },
            { label: 'Alertas medias', data: rankMedias, backgroundColor: 'rgba(217,119,6,0.1)', borderColor: NIVEL_COLOR.MEDIA, fill: true, tension: 0.3 },
          ],
        }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } }, plugins: { ...BASE_OPTS.plugins, legend: { position: 'top' } } })
      } else {
        makeChart('chart-ranking', 'bar', {
          labels: rankLabels,
          datasets: [
            { label: 'Alertas altas',  data: rankAltas,  backgroundColor: NIVEL_COLOR.ALTA  + 'cc', borderRadius: 3 },
            { label: 'Alertas medias', data: rankMedias, backgroundColor: NIVEL_COLOR.MEDIA + 'cc', borderRadius: 3 },
          ],
        }, { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { stepSize: 1 }, stacked: true, grid: { color: '#f3f4f6' } }, y: { stacked: true, grid: { display: false } } }, plugins: { ...BASE_OPTS.plugins, legend: { position: 'top' } } })
      }
    }

    const insights = generarInsights(ejes, tipoAvgs, promedios)
    const insDiv = container.querySelector('#insights-list')
    insDiv.innerHTML = !insights.length
      ? '<p class="empty" style="padding:12px 0">No se generaron conclusiones con los datos actuales.</p>'
      : insights.map(i => `
          <div style="display:flex;gap:14px;padding:12px 16px;border-radius:8px;background:#f8f9fb;border:1px solid var(--border);margin-bottom:10px">
            <div style="font-size:20px;flex-shrink:0;padding-top:2px">${i.icon}</div>
            <div>
              <div style="font-size:13px;font-weight:700;margin-bottom:4px">${i.title}</div>
              <div style="font-size:13px;color:#374151;line-height:1.6">${i.text}</div>
            </div>
          </div>`).join('')
  }

  function vacioHtml(msg = 'No hay evaluaciones registradas para los filtros seleccionados.') {
    return `
      <div class="card" style="text-align:center;padding:48px 20px;color:var(--text-muted)">
        <div style="font-size:40px;margin-bottom:10px">📊</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:4px">Sin datos</div>
        <div style="font-size:13px">${msg}</div>
      </div>`
  }

  function promGlobal(promedios) {
    const vals = promedios.map(e => parseFloat(e.promedioGlobal)).filter(v => !isNaN(v))
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '—'
  }

  function promedioLista(valores) {
    return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null
  }

  function filtrarPromediosPorMateria(promedios, materiaId) {
    if (!materiaId) return promedios

    return promedios
      .map(est => {
        const tipos = (est.promediosPorTipoSaber || []).filter(ts => ts.materiaId === materiaId)
        if (!tipos.length) return null

        const ejes = tipos.flatMap(ts => ts.promediosPorEje || [])
        const promediosEje = ejes
          .map(eje => parseFloat(eje.promedio))
          .filter(valor => !isNaN(valor))

        return {
          ...est,
          promedioGlobal: promedioLista(promediosEje),
          promediosPorTipoSaber: tipos,
          totalAlertasAltas: ejes.filter(eje => eje.nivelAlerta === 'ALTA').length,
          totalAlertasMedias: ejes.filter(eje => eje.nivelAlerta === 'MEDIA').length,
        }
      })
      .filter(Boolean)
  }

  function filtrarAlertasPorMateria(alertas, materiaId) {
    return materiaId ? alertas.filter(alerta => alerta.materiaId === materiaId) : alertas
  }

  function nombreMateriaActual() {
    return selMateria.value
      ? `Materia: ${selMateria.options[selMateria.selectedIndex]?.text || 'Seleccionada'}`
      : 'Materia: Todas'
  }

  function mensajeSinDatosActual() {
    return selMateria.value
      ? `No hay evaluaciones registradas para ${selMateria.options[selMateria.selectedIndex]?.text || 'la materia seleccionada'} con los filtros actuales.`
      : 'No hay evaluaciones registradas para los filtros seleccionados.'
  }

  function abrev(nombre) {
    return nombre.length > 22 ? nombre.slice(0, 20) + '…' : nombre
  }

  function nombreCorto(nombre) {
    const parts = nombre.trim().split(' ')
    return parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : nombre
  }

  function generarInsights(ejes, tipoAvgs, promedios) {
    const ins = []
    const conData = ejes.filter(e => e.avg !== null)

    if (conData.length) {
      const peor = conData.reduce((a, b) => (a.avg < b.avg ? a : b))
      if (peor.avg <= 3.0) {
        ins.push({
          icon: '📉',
          title: 'Eje con mayor debilidad colectiva',
          text: `El eje <strong>${peor.nombre}</strong> (${peor.tipoNombre.replace('Saber ', '')}) tiene el promedio mas bajo: <strong>${peor.avg.toFixed(2)}</strong>/5.`,
        })
      }
    }

    const tipoVals = Object.values(tipoAvgs).filter(t => t.avg !== null)
    if (tipoVals.length >= 2) {
      const min = tipoVals.reduce((a, b) => (a.avg < b.avg ? a : b))
      const max = tipoVals.reduce((a, b) => (a.avg > b.avg ? a : b))
      const dif = max.avg - min.avg
      if (dif >= 0.8) {
        ins.push({
          icon: '⚖️',
          title: 'Desequilibrio entre tipos de saber',
          text: `Brecha de <strong>${dif.toFixed(2)} pts</strong> entre <strong>${max.nombre.replace('Saber ', '')}</strong> (${max.avg.toFixed(2)}) y <strong>${min.nombre.replace('Saber ', '')}</strong> (${min.avg.toFixed(2)}).`,
        })
      }
    }

    const masRiesgo = [...promedios].sort((a, b) => (b.totalAlertasAltas || 0) - (a.totalAlertasAltas || 0))[0]
    if (masRiesgo && (masRiesgo.totalAlertasAltas || 0) > 0) {
      ins.push({
        icon: '🚨',
        title: 'Estudiante con mayor riesgo',
        text: `<strong>${masRiesgo.estudianteNombreCompleto}</strong> - ${masRiesgo.totalAlertasAltas} alerta${masRiesgo.totalAlertasAltas !== 1 ? 's' : ''} alta${masRiesgo.totalAlertasAltas !== 1 ? 's' : ''} · promedio ${parseFloat(masRiesgo.promedioGlobal).toFixed(2)}/5.`,
      })
    }

    const gp = parseFloat(promGlobal(promedios))
    if (!isNaN(gp) && gp > 3.5) {
      ins.push({
        icon: '🌟',
        title: 'Desempeño general satisfactorio',
        text: `Promedio global <strong>${gp.toFixed(2)}/5</strong> - por encima del nivel Intermedio.`,
      })
    }

    return ins
  }
}
