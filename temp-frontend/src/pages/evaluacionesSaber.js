/**
 * Evaluaciones por Saber — flujo visual guiado
 *
 * Paso 1: El sistema carga el año activo y muestra sus períodos como tarjetas.
 * Paso 2: Al seleccionar un período, aparecen las secciones del año como tarjetas.
 * Paso 3: Al seleccionar una sección, aparece la lista de estudiantes con estado visual.
 * Paso 4: Click en estudiante → wizard modal para evaluar (o recalificar) cada tipo de saber.
 */

import './evaluacionesSaber.css'
import {
  getAnioLectivoActivo,
  getPeriodos,
  getSecciones,
  filtrarSeccionesPropias,
  filtrarMateriasPropias,
  getMatriculasBySeccion,
  getEvaluacionesSaberBySeccionPeriodo,
  getTiposSaber,
  getMaterias,
  getEjesPorNivel,
  createEvaluacionSaber,
  updateEvaluacionSaber,
  generarAlertasTematicasEstudiante,
  getUserId,
} from '../api.js'

// ── Estilos de nivel de desempeño (1=Inicial … 5=Avanzado) ──────────────────
const NIVEL_META = [
  null,
  { color: '#6b7280', bg: '#f3f4f6', label: 'Inicial' },
  { color: '#3b82f6', bg: '#dbeafe', label: 'En desarrollo' },
  { color: '#d97706', bg: '#fef3c7', label: 'Intermedio' },
  { color: '#ea580c', bg: '#fed7aa', label: 'Logrado' },
  { color: '#16a34a', bg: '#bbf7d0', label: 'Avanzado' },
]

// Catálogos de saberes
// - tiposSaber y materias: globales, se cargan una sola vez (no dependen del nivel)
// - ejesPorMateriaTipo: depende del nivel de la sección Y del trimestre activo,
//   se recarga al cambiar de sección o de trimestre.
let tiposSaber = []
let materias   = []
let ejesPorMateriaTipo = {}  // key: `${materiaId}_${tipoSaberId}`
let ejesCacheKey       = null  // `${nivelId}_${periodoNumero}` del que se cargó

// ── Helpers ──────────────────────────────────────────────────────────────────

function mesCorto(fechaStr) {
  if (!fechaStr) return ''
  const [, m, d] = fechaStr.split('-')
  const meses = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun',
                 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(d)} ${meses[parseInt(m)]}`
}

function ordinalGrado(n) {
  const nombres = ['', 'Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto']
  return nombres[n] || `${n}°`
}

// ── Render principal ──────────────────────────────────────────────────────────

export function renderEvaluacionesSaber(container) {
  container.innerHTML = `
    <h1>Evaluaciones por Saber</h1>
    <p class="page-desc">
      Registre evaluaciones por tipo de saber. Seleccione el período y su sección
      para ver el estado de cada estudiante.
    </p>

    <!-- Barra de navegación: botón "volver" + breadcrumb -->
    <div id="nav-bar">
      <button id="btn-back-step" class="btn-back-step" type="button" title="Volver al paso anterior" style="display:none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        <span>Volver</span>
      </button>
      <div id="breadcrumb"></div>
    </div>

    <!-- Contenido del paso actual -->
    <div id="step-content"></div>

    <!-- Modal wizard de evaluación -->
    <div id="wizard-overlay">
      <div class="wiz-dialog">
        <div class="wiz-header-pad">
          <div class="wiz-header-top">
            <div>
              <div id="wiz-modo-label">Evaluación por saber</div>
              <h2 id="wiz-nombre"></h2>
            </div>
            <button id="wiz-close" title="Cerrar">&times;</button>
          </div>
          <div id="wiz-steps"></div>
        </div>
        <div id="wiz-body"></div>
        <div class="wiz-footer">
          <button id="wiz-prev" class="btn btn-secondary">← Anterior</button>
          <div id="wiz-msg"></div>
          <button id="wiz-next" class="btn btn-primary">Siguiente →</button>
        </div>
      </div>
    </div>
  `

  // ── Refs ──────────────────────────────────────────────────────────────────
  const breadcrumb   = container.querySelector('#breadcrumb')
  const btnBackStep  = container.querySelector('#btn-back-step')
  const stepContent  = container.querySelector('#step-content')
  const wizOverlay   = container.querySelector('#wizard-overlay')
  const wizNombre    = container.querySelector('#wiz-nombre')
  const wizModoLabel = container.querySelector('#wiz-modo-label')
  const wizSteps     = container.querySelector('#wiz-steps')
  const wizBody      = container.querySelector('#wiz-body')
  const wizPrev      = container.querySelector('#wiz-prev')
  const wizNext      = container.querySelector('#wiz-next')
  const wizMsg       = container.querySelector('#wiz-msg')

  // ── Estado de navegación ──────────────────────────────────────────────────
  let anioActivo   = null
  let periodoSel   = null
  let seccionSel   = null
  let materiaSel   = null
  let estudiantes  = []
  // {[estudianteId]: {[`${materiaId}_${tipoSaberId}`]: {id, detalles, materiaId, tipoSaberId, ...}}}
  let evalsPorEstudiante = {}

  // Estado del wizard
  let wizEstudiante  = null
  let wizMateria     = null   // congelada al abrir el wizard, no cambia si el usuario cambia de tab
  let wizModo        = 'nuevo'   // 'nuevo' | 'editar'
  let wizPendientes  = []
  let wizStep        = 0
  let wizRespuestas  = {}
  let wizTempNextHandler = null  // handler temporal del paso de selección de saberes (Bug 2)

  // ── Catálogos ─────────────────────────────────────────────────────────────
  /**
   * Carga catálogos base que no dependen del nivel (tipos de saber y materias
   * accesibles al usuario). Se ejecuta una sola vez.
   */
  async function ensureBaseCatalogs() {
    if (tiposSaber.length && materias.length) return
    let allMaterias
    ;[tiposSaber, allMaterias] = await Promise.all([getTiposSaber(), getMaterias()])
    materias = await filtrarMateriasPropias(allMaterias)
  }

  /**
   * Recarga los ejes temáticos restringidos al grado de la sección activa
   * (V12+) y al trimestre seleccionado (V20+). Reemplaza el índice anterior
   * que solo filtraba por grado y mostraba los 33 ejes del año mezclados.
   *
   * Requiere {@code seccion.nivelId} (siempre lo provee SeccionResponseDto).
   * Si por alguna razón no llegara, deja el índice vacío y la UI mostrará
   * "Sin ejes en este grado" sin permitir abrir el wizard.
   *
   * El filtro por trimestre se aplica si {@code periodoSel.numeroPeriodo}
   * existe. La caché se invalida cuando cambia el grado o el trimestre.
   */
  async function loadEjesParaSeccion(seccion) {
    const nivelId        = seccion?.nivelId
    const periodoNumero  = periodoSel?.numeroPeriodo ?? null
    const cacheKey       = nivelId != null ? `${nivelId}_${periodoNumero ?? 'any'}` : null
    if (cacheKey && ejesCacheKey === cacheKey) return  // ya cargado para este (grado, trimestre)

    let allEjes = []
    if (nivelId) {
      try {
        allEjes = await getEjesPorNivel(nivelId, periodoNumero ? { periodoNumero } : {})
      } catch (e) {
        console.warn('Error cargando ejes por nivel:', e.message)
      }
    }

    ejesPorMateriaTipo = {}
    for (const eje of allEjes) {
      const key = `${eje.materiaId}_${eje.tipoSaberId}`
      if (!ejesPorMateriaTipo[key]) ejesPorMateriaTipo[key] = []
      ejesPorMateriaTipo[key].push(eje)
    }
    for (const k of Object.keys(ejesPorMateriaTipo)) {
      ejesPorMateriaTipo[k].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    }
    ejesCacheKey = cacheKey
  }

  // ── Botón "Volver" ────────────────────────────────────────────────────────
  /**
   * Retrocede un paso en el flujo:
   *  - Si hay sección seleccionada → vuelve a la lista de secciones.
   *  - Si solo hay período seleccionado → vuelve a la lista de períodos.
   *  - Si no hay nada seleccionado → no hace nada (botón oculto).
   */
  function volverPasoAnterior() {
    if (seccionSel) {
      seccionSel = null
      estudiantes = []
      evalsPorEstudiante = {}
      renderStep()
    } else if (periodoSel) {
      periodoSel = null
      renderStep()
    }
  }

  function refreshBackButton() {
    if (!btnBackStep) return
    // El botón solo tiene sentido a partir del paso 2 (con período seleccionado).
    btnBackStep.style.display = (periodoSel || seccionSel) ? '' : 'none'
  }

  btnBackStep.addEventListener('click', volverPasoAnterior)

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  function renderBreadcrumb() {
    const crumbs = [{ label: anioActivo ? `Año ${anioActivo.anio}` : '…', action: null }]

    if (periodoSel) crumbs.push({
      label: periodoSel.nombre,
      action: () => { seccionSel = null; estudiantes = []; evalsPorEstudiante = {}; renderStep() },
    })
    if (seccionSel) crumbs.push({
      label: `${ordinalGrado(seccionSel.nivelGrado)} · Sección ${seccionSel.nombre}`,
      action: null,
    })

    breadcrumb.innerHTML = crumbs.map((c, i) => `
      ${i > 0 ? '<span class="crumb-sep">›</span>' : ''}
      <span class="${c.action ? 'crumb-link' : 'crumb-active'}" data-crumb="${i}">${c.label}</span>
    `).join('')

    breadcrumb.querySelectorAll('[data-crumb]').forEach(el => {
      const i = parseInt(el.dataset.crumb)
      if (crumbs[i].action) el.addEventListener('click', crumbs[i].action)
    })
  }

  // ── Render del paso actual ────────────────────────────────────────────────
  function renderStep() {
    renderBreadcrumb()
    refreshBackButton()
    if (!periodoSel) renderStepPeriodos()
    else if (!seccionSel) renderStepSecciones()
    else renderStepEstudiantes()
  }

  // ── PASO 1: Períodos ──────────────────────────────────────────────────────
  async function renderStepPeriodos() {
    stepContent.innerHTML = '<p class="loading">Cargando períodos…</p>'

    try {
      anioActivo = await getAnioLectivoActivo()
      const periodos = await getPeriodos(anioActivo.id)

      stepContent.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Seleccione el período</h2>
              <p class="card-subtitle">
                Año lectivo ${anioActivo.anio} · ${periodos.length} períodos
              </p>
            </div>
          </div>
          <div class="periodo-grid">
            ${periodos.map(p => {
              const isActivo = p.activo
              const hoy = new Date().toISOString().split('T')[0]
              const pasado = p.fechaFin < hoy && !isActivo

              let borderColor, badgeBg, badgeColor, badgeText, cardBg
              if (isActivo) {
                borderColor = '#16a34a'; cardBg = '#f0fdf4'; badgeBg = '#dcfce7'
                badgeColor = '#16a34a'; badgeText = 'Activo'
              } else if (pasado) {
                borderColor = '#d1d5db'; cardBg = '#f9fafb'; badgeBg = '#f3f4f6'
                badgeColor = '#6b7280'; badgeText = 'Finalizado'
              } else {
                borderColor = '#93c5fd'; cardBg = '#eff6ff'; badgeBg = '#dbeafe'
                badgeColor = '#2563eb'; badgeText = 'Próximo'
              }

              return `
                <div class="periodo-card" data-periodo='${JSON.stringify(p)}' style="border-color:${borderColor};background:${cardBg}">
                  <div class="periodo-num" style="color:${borderColor}">${p.numeroPeriodo}</div>
                  <div class="periodo-nombre">${p.nombre}</div>
                  <div class="periodo-fechas">${mesCorto(p.fechaInicio)} → ${mesCorto(p.fechaFin)}</div>
                  <span class="periodo-badge" style="background:${badgeBg};color:${badgeColor}">${badgeText}</span>
                </div>
              `
            }).join('')}
          </div>
        </div>
      `

      stepContent.querySelectorAll('.periodo-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
          card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'
          card.style.transform = 'translateY(-2px)'
        })
        card.addEventListener('mouseleave', () => {
          card.style.boxShadow = ''
          card.style.transform = ''
        })
        card.addEventListener('click', () => {
          periodoSel = JSON.parse(card.dataset.periodo)
          renderStep()
        })
      })

      renderBreadcrumb()

    } catch (e) {
      stepContent.innerHTML = `<div class="card"><p class="error-text">Error cargando períodos: ${e.message}</p></div>`
    }
  }

  // ── PASO 2: Secciones ─────────────────────────────────────────────────────
  async function renderStepSecciones() {
    stepContent.innerHTML = '<p class="loading">Cargando secciones…</p>'

    try {
      const secciones = await filtrarSeccionesPropias(await getSecciones(anioActivo.id))

      stepContent.innerHTML = `
        <div class="card">
          <div class="card-intro">
            <h2 class="card-title">Seleccione su sección</h2>
            <p class="card-subtitle">
              ${periodoSel.nombre} · ${secciones.length} sección(es) disponibles
            </p>
          </div>
          <div class="seccion-grid">
            ${secciones.map(s => {
              const grado    = ordinalGrado(s.nivelGrado)
              const initials = `${s.nivelGrado}${s.nombre}`
              return `
                <div class="seccion-card" data-seccion='${JSON.stringify(s)}'>
                  <div class="seccion-card-inner">
                    <div class="seccion-avatar">${initials}</div>
                    <div>
                      <div class="seccion-nombre">${grado} · Sección ${s.nombre}</div>
                      <div class="seccion-centro">${s.centroNombre}</div>
                      ${s.docenteNombreCompleto ? `
                        <div class="seccion-docente">
                          <span class="seccion-docente-label">Docente:</span>
                          <span class="seccion-docente-nombre">${s.docenteNombreCompleto}</span>
                        </div>` : ''}
                    </div>
                  </div>
                </div>
              `
            }).join('')}
          </div>
        </div>
      `

      stepContent.querySelectorAll('.seccion-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
          card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'
          card.style.transform = 'translateY(-2px)'
        })
        card.addEventListener('mouseleave', () => {
          card.style.boxShadow = ''
          card.style.transform = ''
        })
        card.addEventListener('click', async () => {
          seccionSel = JSON.parse(card.dataset.seccion)
          await cargarEstudiantes()
          renderStep()
        })
      })

    } catch (e) {
      stepContent.innerHTML = `<div class="card"><p class="error-text">Error cargando secciones: ${e.message}</p></div>`
    }
  }

  // ── Carga de estudiantes y estado de evaluaciones ─────────────────────────
  async function cargarEstudiantes() {
    await ensureBaseCatalogs()
    await loadEjesParaSeccion(seccionSel)
    materiaSel = materias[0] ?? null
    const [matriculas, evalsRaw] = await Promise.all([
      getMatriculasBySeccion(seccionSel.id),
      getEvaluacionesSaberBySeccionPeriodo(seccionSel.id, periodoSel.id).catch(() => []),
    ])

    estudiantes = matriculas.map(m => ({
      id: m.estudianteId,
      nombreCompleto: m.estudianteNombreCompleto,
    }))

    // Indexar evaluaciones por estudiante y (materiaId_tipoSaberId)
    evalsPorEstudiante = {}
    for (const ev of evalsRaw) {
      if (!evalsPorEstudiante[ev.estudianteId]) evalsPorEstudiante[ev.estudianteId] = {}
      const key = `${ev.materiaId}_${ev.tipoSaberId}`
      evalsPorEstudiante[ev.estudianteId][key] = {
        id:          ev.id,
        detalles:    ev.detalles || [],
        fecha:       ev.fechaEvaluacion,
        observacion: ev.observacion || '',
        materiaId:   ev.materiaId,
        tipoSaberId: ev.tipoSaberId,
      }
    }
  }

  /**
   * Tipos de saber que tienen al menos un eje evaluable para la materia y el
   * grado actuales. Usado para calcular completitud (un estudiante está
   * "completo" cuando todos los saberes evaluables están registrados, no
   * cuando se cubrieron los 3 globales).
   */
  function tiposEvaluablesParaMateria(matId) {
    if (!matId) return []
    return tiposSaber.filter(t =>
      (ejesPorMateriaTipo[`${matId}_${t.id}`] || []).length > 0
    )
  }

  // ── Cálculo de estado por saber y por estudiante ─────────────────────────
  //
  // Un saber NO se considera "completo" solo porque exista un registro de
  // EvaluacionSaber. Cada eje del saber debe estar calificado con valor > 0.
  // Si solo algunos ejes están calificados → el saber está "parcial" y el
  // estudiante NO está completo hasta que todos sus saberes lo estén.

  function estadoSaber(ev, matId, tipoId) {
    if (!ev) return 'vacio'
    const ejes = ejesPorMateriaTipo[`${matId}_${tipoId}`] || []
    if (ejes.length === 0) return 'vacio'  // saber no evaluable en este grado
    const evaluados = new Set(
      (ev.detalles || []).filter(d => d.valor > 0).map(d => d.ejeTemaaticoId)
    )
    if (evaluados.size === 0)         return 'vacio'
    if (evaluados.size >= ejes.length && ejes.every(e => evaluados.has(e.id))) return 'completo'
    return 'parcial'
  }

  function conteoEjes(ev, matId, tipoId) {
    const ejes = ejesPorMateriaTipo[`${matId}_${tipoId}`] || []
    const total = ejes.length
    if (!ev || !total) return { hechos: 0, total }
    const evaluados = new Set(
      (ev.detalles || []).filter(d => d.valor > 0).map(d => d.ejeTemaaticoId)
    )
    const hechos = ejes.filter(e => evaluados.has(e.id)).length
    return { hechos, total }
  }

  function estadoEstudiante(estId, matId, tiposEval) {
    const evals = evalsPorEstudiante[estId] || {}
    let cntCompleto = 0, cntParcial = 0
    for (const t of tiposEval) {
      const st = estadoSaber(evals[`${matId}_${t.id}`], matId, t.id)
      if      (st === 'completo') cntCompleto++
      else if (st === 'parcial')  cntParcial++
    }
    let etiqueta = 'vacio'
    if (cntCompleto === tiposEval.length && tiposEval.length > 0) etiqueta = 'completo'
    else if (cntCompleto > 0 || cntParcial > 0)                   etiqueta = 'parcial'
    return { etiqueta, cntCompleto, cntParcial }
  }

  // ── PASO 3: Grilla de estudiantes ─────────────────────────────────────────
  function renderStepEstudiantes() {
    const matId     = materiaSel?.id
    const tiposEval = tiposEvaluablesParaMateria(matId)
    const total     = tiposEval.length

    // Contadores: distinguimos completos (todos los ejes de todos los saberes),
    // parciales (al menos un eje pero no todos), y vacíos (sin ningún eje).
    let completos = 0, parciales = 0
    if (total > 0) {
      for (const e of estudiantes) {
        const { etiqueta } = estadoEstudiante(e.id, matId, tiposEval)
        if (etiqueta === 'completo')      completos++
        else if (etiqueta === 'parcial')  parciales++
      }
    }
    const sinEvaluar = estudiantes.length - completos - parciales

    stepContent.innerHTML = `
      <div class="card">
        <div class="section-actions">
          <div>
            <h2 class="card-title">
              ${ordinalGrado(seccionSel.nivelGrado)} · Sección ${seccionSel.nombre}
              <span class="h2-sub">${seccionSel.centroNombre}</span>
            </h2>
            <p class="card-subtitle">
              ${periodoSel.nombre} · ${estudiantes.length} estudiantes
              · <span class="text-success">${completos} completos</span>
              · <span class="text-warning">${parciales} parciales</span>
              · <span class="text-danger">${sinEvaluar} sin evaluar</span>
            </p>
          </div>
          <div class="legend-row">
            <span class="legend-item">
              <span class="legend-dot legend-dot--danger"></span>Sin evaluar
            </span>
            <span class="legend-item">
              <span class="legend-dot legend-dot--warning"></span>Parcial
            </span>
            <span class="legend-item">
              <span class="legend-dot legend-dot--success"></span>Completo
            </span>
          </div>
        </div>

        <!-- Tabs de materia -->
        <div id="materia-tabs">
          ${materias.map(m => {
            const sel = materiaSel?.id === m.id
            return `<button class="mat-tab${sel ? ' mat-tab--active' : ''}" data-mat='${JSON.stringify(m)}'>${m.nombre}</button>`
          }).join('')}
        </div>

        <div id="student-grid"></div>
      </div>
    `

    stepContent.querySelectorAll('.mat-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        materiaSel = JSON.parse(btn.dataset.mat)
        renderStepEstudiantes()
      })
    })

    renderGrid(container.querySelector('#student-grid'))
  }

  function renderGrid(grid) {
    const matId     = materiaSel?.id
    const tiposEval = tiposEvaluablesParaMateria(matId)
    const total     = tiposEval.length

    grid.innerHTML = estudiantes.map(est => {
      const evals = evalsPorEstudiante[est.id] || {}
      const { etiqueta, cntCompleto, cntParcial } = total > 0
        ? estadoEstudiante(est.id, matId, tiposEval)
        : { etiqueta: 'vacio', cntCompleto: 0, cntParcial: 0 }

      let borderColor, badgeText, badgeBg, cardBg
      if (total === 0) {
        borderColor = '#9ca3af'; badgeText = 'Sin ejes en este grado'; badgeBg = '#f3f4f6'; cardBg = '#f9fafb'
      } else if (etiqueta === 'vacio') {
        borderColor = '#dc2626'; badgeText = 'Sin evaluar'; badgeBg = '#fee2e2'; cardBg = '#fff5f5'
      } else if (etiqueta === 'parcial') {
        // Saberes con todos sus ejes vs. saberes con algún eje pero no todos.
        const detalle = cntParcial > 0
          ? `${cntCompleto}/${total} saberes · ${cntParcial} parcial${cntParcial === 1 ? '' : 'es'}`
          : `${cntCompleto}/${total} saberes`
        borderColor = '#d97706'; badgeText = detalle; badgeBg = '#fef3c7'; cardBg = '#fffdf0'
      } else {
        borderColor = '#16a34a'; badgeText = 'Completo ✓'; badgeBg = '#dcfce7'; cardBg = '#f0fdf4'
      }

      const initials = est.nombreCompleto.split(' ').filter(Boolean)
        .map(w => w[0]).slice(0, 2).join('').toUpperCase()

      const saberChips = tiposEval.map(t => {
        const ev = evals[`${matId}_${t.id}`]
        const st = estadoSaber(ev, matId, t.id)
        const { hechos, total: totalEjes } = conteoEjes(ev, matId, t.id)
        let icon, cls, suffix = ''
        if (st === 'completo') {
          icon = '✓'; cls = 'saber-chip--done'
          if (ev?.detalles?.length) {
            const sum = ev.detalles.reduce((acc, d) => acc + d.valor, 0)
            const avg = (sum / ev.detalles.length).toFixed(1)
            suffix = ` · ${avg}`
          }
        } else if (st === 'parcial') {
          icon = '◐'; cls = 'saber-chip--partial'; suffix = ` · ${hechos}/${totalEjes}`
        } else {
          icon = '○'; cls = 'saber-chip--pending'
        }
        return `<span class="saber-chip ${cls}">${icon} ${t.nombre}${suffix}</span>`
      }).join('')

      const accionLabel = etiqueta === 'completo'
        ? `<div class="s-action s-action--done"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg> Recalificar</div>`
        : etiqueta === 'parcial'
          ? `<div class="s-action" style="color:${borderColor}">Continuar →</div>`
          : `<div class="s-action" style="color:${borderColor}">Evaluar →</div>`

      return `
        <div class="s-card" data-est-id="${est.id}" style="border-color:${borderColor};background:${cardBg}">
          <div class="s-card-top">
            <div class="s-avatar" style="background:${borderColor}">${initials}</div>
            <div class="s-info">
              <div class="s-nombre">${est.nombreCompleto}</div>
              <span class="s-badge" style="background:${badgeBg};color:${borderColor}">${badgeText}</span>
            </div>
          </div>
          <div class="s-chips">${saberChips}</div>
          ${accionLabel}
        </div>
      `
    }).join('')

    grid.querySelectorAll('.s-card').forEach(card => {
      const estId = parseInt(card.dataset.estId)

      card.addEventListener('mouseenter', () => {
        card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.14)'
        card.style.transform = 'translateY(-2px)'
      })
      card.addEventListener('mouseleave', () => {
        card.style.boxShadow = ''
        card.style.transform = ''
      })
      card.addEventListener('click', () => {
        const est = estudiantes.find(e => e.id === estId)
        const matId = materiaSel?.id
        const tiposEvalClick = tiposEvaluablesParaMateria(matId)
        if (!tiposEvalClick.length) return  // sin ejes en este grado → no abrir wizard
        // Solo abrir en modo "editar" (recalificar) cuando TODOS los saberes
        // están completos. Si hay parciales o vacíos, abrir en modo "nuevo"
        // para que el docente pueda continuar/terminar la evaluación.
        const { etiqueta } = estadoEstudiante(estId, matId, tiposEvalClick)
        openWizard(est, etiqueta === 'completo' ? 'editar' : 'nuevo')
      })
    })
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  function openWizard(est, modo) {
    wizEstudiante  = est
    wizMateria     = materiaSel   // congela la materia activa al momento de abrir
    wizModo        = modo
    wizStep        = 0
    wizRespuestas  = {}
    wizMsg.textContent  = ''
    wizNext.disabled    = false
    wizNext.textContent = 'Siguiente →'

    const evals = evalsPorEstudiante[est.id] || {}
    const today = new Date().toISOString().split('T')[0]
    wizNombre.textContent = est.nombreCompleto

    // Filtrar tipos de saber sin ejes en este grado/materia (V12+).
    const matId = wizMateria?.id
    const tiposConEjes = tiposSaber.filter(t =>
      (ejesPorMateriaTipo[`${matId}_${t.id}`] || []).length > 0
    )

    if (modo === 'nuevo') {
      // Incluir saberes vacíos Y saberes parciales (con algunos ejes ya
      // calificados): el docente puede así "continuar" donde lo dejó.
      // Los saberes COMPLETOS se omiten — para modificarlos hay que entrar
      // a través del modo "Recalificar".
      wizPendientes = tiposConEjes.filter(t =>
        estadoSaber(evals[`${matId}_${t.id}`], matId, t.id) !== 'completo'
      )
      for (const tipo of wizPendientes) {
        const ev = evals[`${matId}_${tipo.id}`]
        const detallesMap = {}
        if (ev?.detalles) {
          for (const d of ev.detalles) detallesMap[d.ejeTemaaticoId] = d.valor
        }
        // evalId != null cuando el saber es parcial — la guardada usará PUT
        // para reemplazar detalles existentes en lugar de crear un duplicado.
        wizRespuestas[tipo.id] = {
          evalId:      ev?.id ?? null,
          fecha:       ev?.fecha ?? today,
          observacion: ev?.observacion ?? '',
          detalles:    detallesMap,
        }
      }
      wizModoLabel.textContent = 'Evaluación por saber'
      wizModoLabel.classList.remove('wiz-modo--recal')
      if (!wizPendientes.length) return
      refreshWizardUI()
      wizOverlay.style.display = 'flex'
    } else {
      // Editar: primero mostrar pantalla previa de selección de saberes con
      // promedios y alertas pre-marcadas. showSeleccionSaberes configura
      // wizPendientes / wizRespuestas y arranca el wizard al continuar.
      wizModoLabel.textContent = 'Recalificación'
      wizModoLabel.classList.add('wiz-modo--recal')
      if (!tiposConEjes.length) return  // grado sin ejes evaluables → no abrir
      showSeleccionSaberes(est, evals, today, tiposConEjes)
    }
  }

  function showSeleccionSaberes(est, evals, today, tiposConEjes = null) {
    const matId = wizMateria?.id
    const tiposDisponibles = tiposConEjes ?? tiposSaber.filter(t =>
      (ejesPorMateriaTipo[`${matId}_${t.id}`] || []).length > 0
    )
    const items = tiposDisponibles.map(t => {
      const ev = evals[`${matId}_${t.id}`]
      let promedio = null
      if (ev?.detalles?.length) {
        const sum = ev.detalles.reduce((a, d) => a + d.valor, 0)
        promedio = (sum / ev.detalles.length).toFixed(1)
      }
      const nivelAlerta = promedio !== null
        ? (promedio <= 2.0 ? 'Alerta alta' : promedio <= 3.0 ? 'Alerta media' : 'Sin alerta')
        : '—'
      return { tipo: t, ev, promedio, nivelAlerta }
    })

    wizBody.innerHTML = `
      <p class="wiz-sel-intro">
        Selecciona los saberes que deseas recalificar. Los no seleccionados se mantienen igual.
      </p>
      ${items.map(item => `
        <label class="saber-sel-row" data-tipo-id="${item.tipo.id}">
          <input type="checkbox" class="saber-checkbox" data-tipo-id="${item.tipo.id}"
            ${item.promedio !== null && parseFloat(item.promedio) <= 3.0 ? 'checked' : ''}>
          <div class="saber-sel-info">
            <div class="saber-sel-nombre">${item.tipo.nombre}</div>
            <div class="saber-sel-meta">
              Promedio actual: <strong>${item.promedio !== null ? item.promedio : 'No evaluado'}</strong>
              &nbsp;·&nbsp; ${item.nivelAlerta}
            </div>
          </div>
        </label>
      `).join('')}
      <p class="saber-sel-hint">
        Los saberes con alerta (≤ 3.0) aparecen pre-seleccionados.
      </p>
    `

    // Highlight al hacer hover / check
    wizBody.querySelectorAll('.saber-sel-row').forEach(row => {
      const cb = row.querySelector('.saber-checkbox')
      const update = () => row.classList.toggle('saber-sel-row--checked', cb.checked)
      update()
      cb.addEventListener('change', update)
      row.addEventListener('click', e => {
        if (e.target === cb) return
        cb.checked = !cb.checked
        update()
      })
    })

    wizSteps.innerHTML = ''
    wizPrev.style.visibility = 'hidden'
    wizNext.textContent = 'Continuar →'

    // Reemplazar handler de next temporalmente
    const onNext = () => {
      const seleccionados = [...wizBody.querySelectorAll('.saber-checkbox:checked')]
        .map(cb => tiposSaber.find(t => t.id === parseInt(cb.dataset.tipoId)))
        .filter(Boolean)

      if (!seleccionados.length) {
        wizMsg.style.color = '#dc2626'
        wizMsg.textContent = 'Selecciona al menos un saber para recalificar.'
        return
      }

      wizMsg.textContent = ''
      wizPendientes = seleccionados

      // Pre-rellenar respuestas con valores actuales
      for (const tipo of wizPendientes) {
        const ev = evals[`${matId}_${tipo.id}`]
        const detallesMap = {}
        if (ev?.detalles) {
          for (const d of ev.detalles) detallesMap[d.ejeTemaaticoId] = d.valor
        }
        wizRespuestas[tipo.id] = {
          evalId:      ev?.id ?? null,
          fecha:       ev?.fecha ?? today,
          observacion: ev?.observacion ?? '',
          detalles:    detallesMap,
        }
      }

      wizStep = 0
      refreshWizardUI()
      wizNext.removeEventListener('click', onNext)
      wizNext.addEventListener('click', onNextDefault)
      wizTempNextHandler = null
    }

    wizNext.removeEventListener('click', onNextDefault)
    wizNext.addEventListener('click', onNext)
    wizTempNextHandler = onNext  // permite a closeWizard limpiarlo si el usuario cierra antes de continuar
    wizOverlay.style.display = 'flex'
  }

  // Handler por defecto de "Siguiente" (dentro del wizard)
  const onNextDefault = async () => {
    const ok = await guardarPasoActual()
    if (!ok) return
    const isLast = wizStep === wizPendientes.length - 1
    if (isLast) {
      wizNext.disabled = true
      wizNext.textContent = 'Generando alertas…'
      try { await generarAlertasTematicasEstudiante(wizEstudiante.id, periodoSel.id) } catch (e) { console.warn('Alerta generación falló:', e?.message) }
      wizOverlay.style.display = 'none'
      renderGrid(container.querySelector('#student-grid'))
    } else {
      wizMsg.style.color = '#16a34a'
      wizMsg.textContent = `✓ ${wizPendientes[wizStep].nombre} guardado`
      wizStep++
      refreshWizardUI()
      wizBody.scrollTop = 0
    }
  }

  function refreshWizardUI() {
    // Steps indicator
    wizSteps.innerHTML = wizPendientes.map((t, i) => {
      const active = i === wizStep, done = i < wizStep
      const evals  = evalsPorEstudiante[wizEstudiante?.id] || {}
      const ev     = evals[`${wizMateria?.id}_${t.id}`]
      const st     = estadoSaber(ev, wizMateria?.id, t.id)
      // Marcar visualmente:
      //   - "(editar)" si vienes en modo recalificación.
      //   - "(continuar)" si el saber está parcial en modo nuevo.
      let suffix = ''
      let modClass = ''
      if (active)      modClass = 'wiz-step-pill--active'
      else if (done)   modClass = 'wiz-step-pill--done'
      else if (st !== 'vacio' && wizModo === 'editar')  { modClass = 'wiz-step-pill--edit'; suffix = ' (editar)' }
      else if (st === 'parcial' && wizModo === 'nuevo') { modClass = 'wiz-step-pill--edit'; suffix = ' (continuar)' }
      return `
        <div class="wiz-step-pill ${modClass}">${done ? '✓ ' : (i + 1) + '. '}${t.nombre}${suffix}</div>
        ${i < wizPendientes.length - 1 ? '<div class="wiz-step-sep">›</div>' : ''}
      `
    }).join('')

    // Body
    const tipo   = wizPendientes[wizStep]
    const ejes   = ejesPorMateriaTipo[`${wizMateria?.id}_${tipo.id}`] || []
    const resp   = wizRespuestas[tipo.id]
    const isEdit = wizModo === 'editar' && resp.evalId != null

    wizBody.innerHTML = `
      ${isEdit ? `<div class="wiz-edit-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>Los valores anteriores serán reemplazados al guardar este saber.</span>
      </div>` : ''}
      <div class="wiz-form-row">
        <div class="form-group wiz-form-group">
          <label class="wiz-form-label">Fecha de evaluación</label>
          <input type="date" id="wiz-fecha" value="${resp.fecha}">
        </div>
        <div class="form-group wiz-form-group--flex">
          <label class="wiz-form-label">Observación general (opcional)</label>
          <input type="text" id="wiz-obs" placeholder="Comentarios…" value="${resp.observacion || ''}">
        </div>
      </div>
      <div class="wiz-ejes-titulo">Ejes temáticos — ${tipo.nombre} (${ejes.length} ejes)</div>
      ${ejes.map(eje => {
        const cur = resp.detalles[eje.id] || 0
        return `
          <div class="wiz-eje-card">
            <div class="wiz-eje-nombre">${eje.nombre}</div>
            ${eje.descripcion ? `<div class="wiz-eje-desc">${eje.descripcion}</div>` : '<div class="wiz-eje-desc"></div>'}
            <div class="wiz-niv-row">
              ${NIVEL_META.slice(1).map((meta, i) => {
                const val = i + 1, sel = cur === val
                return `<button class="niv-btn${sel ? ' niv-btn--sel' : ''}" data-eje="${eje.id}" data-val="${val}" style="--niv-color:${meta.color};--niv-bg:${meta.bg}">${val}. ${meta.label}</button>`
              }).join('')}
            </div>
          </div>
        `
      }).join('')}
    `

    wizBody.querySelector('#wiz-fecha').addEventListener('change', e => {
      wizRespuestas[tipo.id].fecha = e.target.value
    })
    wizBody.querySelector('#wiz-obs').addEventListener('input', e => {
      wizRespuestas[tipo.id].observacion = e.target.value
    })
    wizBody.querySelectorAll('.niv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ejeId = parseInt(btn.dataset.eje)
        const val   = parseInt(btn.dataset.val)
        wizRespuestas[tipo.id].detalles[ejeId] = val
        wizBody.querySelectorAll(`.niv-btn[data-eje="${ejeId}"]`).forEach(b => {
          b.classList.toggle('niv-btn--sel', parseInt(b.dataset.val) === val)
        })
      })
    })

    wizPrev.style.visibility = wizStep === 0 ? 'hidden' : 'visible'
    wizNext.textContent = wizStep === wizPendientes.length - 1
      ? (wizModo === 'editar' ? 'Guardar recalificación ✓' : 'Guardar y finalizar ✓')
      : 'Guardar y continuar →'
  }

  async function guardarPasoActual() {
    const tipo = wizPendientes[wizStep]
    const resp = wizRespuestas[tipo.id]
    resp.fecha       = wizBody.querySelector('#wiz-fecha')?.value || resp.fecha
    resp.observacion = wizBody.querySelector('#wiz-obs')?.value   || ''

    const detalles = Object.entries(resp.detalles)
      .filter(([, v]) => v > 0)
      .map(([ejeId, valor]) => ({ ejeTemaaticoId: parseInt(ejeId), valor, observacion: null }))

    if (!detalles.length) {
      wizMsg.style.color = '#dc2626'
      wizMsg.textContent = 'Evalúe al menos un eje antes de continuar.'
      return false
    }

    wizNext.disabled = true
    wizNext.textContent = 'Guardando…'
    wizMsg.textContent = ''

    try {
      const uid = getUserId()
      const payload = {
        estudianteId:    wizEstudiante.id,
        periodoId:       periodoSel.id,
        usuarioId:       uid ? parseInt(uid) : 2,
        seccionId:       seccionSel.id,
        materiaId:       wizMateria.id,
        tipoSaberId:     tipo.id,
        fechaEvaluacion: resp.fecha || null,
        observacion:     resp.observacion || null,
        detalles,
      }

      // PUT (reemplazar detalles) cuando ya existe un registro previo,
      // independientemente del modo. Esto cubre dos casos:
      //   - "editar" (recalificación): siempre tiene evalId.
      //   - "nuevo" sobre un saber parcial: también trae evalId del registro
      //     creado en la sesión anterior y debe completarse, no duplicarse.
      let savedEval
      if (resp.evalId != null) {
        savedEval = await updateEvaluacionSaber(resp.evalId, payload)
      } else {
        savedEval = await createEvaluacionSaber(payload)
      }
      // Persistir el id para los siguientes pasos del mismo wizard, así si el
      // docente vuelve atrás y vuelve a guardar el mismo saber, sigue siendo
      // un PUT y no se crea un duplicado.
      resp.evalId = savedEval.id

      // Actualizar el índice local con los nuevos valores
      if (!evalsPorEstudiante[wizEstudiante.id]) evalsPorEstudiante[wizEstudiante.id] = {}
      const cacheKey = `${wizMateria.id}_${tipo.id}`
      evalsPorEstudiante[wizEstudiante.id][cacheKey] = {
        id:          savedEval.id,
        detalles:    savedEval.detalles || [],
        fecha:       savedEval.fechaEvaluacion,
        observacion: savedEval.observacion || '',
        materiaId:   wizMateria.id,
        tipoSaberId: tipo.id,
      }

      return true
    } catch (e) {
      wizMsg.style.color = '#dc2626'
      wizMsg.textContent = `Error: ${e.message}`
      return false
    } finally {
      wizNext.disabled = false
    }
  }

  wizPrev.addEventListener('click', () => {
    if (wizStep === 0) return
    wizStep--
    wizMsg.textContent = ''
    refreshWizardUI()
  })

  wizNext.addEventListener('click', onNextDefault)

  function closeWizard() {
    wizOverlay.style.display = 'none'
    // Si el usuario cierra durante la pantalla de selección de saberes,
    // limpiar el handler temporal y restaurar el handler por defecto.
    if (wizTempNextHandler) {
      wizNext.removeEventListener('click', wizTempNextHandler)
      wizNext.addEventListener('click', onNextDefault)
      wizTempNextHandler = null
    }
    const g = container.querySelector('#student-grid')
    if (g) renderGrid(g)
  }
  container.querySelector('#wiz-close').addEventListener('click', closeWizard)
  wizOverlay.addEventListener('click', e => { if (e.target === wizOverlay) closeWizard() })

  // ── Arranque ──────────────────────────────────────────────────────────────
  renderStep()
}
