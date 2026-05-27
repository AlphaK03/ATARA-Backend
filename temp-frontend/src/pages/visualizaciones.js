/**
 * Visualizaciones — Mapa de calor pedagógico (datos reales)
 *
 * Filas    = estudiantes reales de la sección
 * Columnas = ejes temáticos agrupados por tipo de saber (Conceptual / Procedimental / Actitudinal)
 * Celdas   = promedio por eje (escala 1–5) coloreado por nivel de alerta
 *
 * Escala y colores:
 *   > 3.0  → Verde   (Sin alerta)
 *   2.1–3  → Ámbar   (Alerta media)
 *   ≤ 2.0  → Rojo    (Alerta alta)
 */

import './visualizaciones.css'
import {
  getAnioLectivoActivo,
  getPeriodos,
  getSecciones,
  filtrarSeccionesPropias,
  getMatriculasBySeccion,
  getPromediosSeccionSaber,
} from '../api.js'

// ── Paleta ────────────────────────────────────────────────────────────────────
const ALERTA_COLOR = {
  ALTA:       { bg: '#fee2e2', color: '#dc2626', label: 'Alerta alta'  },
  MEDIA:      { bg: '#fef3c7', color: '#d97706', label: 'Alerta media' },
  SIN_ALERTA: { bg: '#dcfce7', color: '#16a34a', label: 'Sin alerta'   },
  null:       { bg: '#f3f4f6', color: '#9ca3af', label: 'Sin datos'    },
}

function colorFromValue(v) {
  if (v === null || v === undefined) return ALERTA_COLOR.null
  if (v <= 2.0) return ALERTA_COLOR.ALTA
  if (v <= 3.0) return ALERTA_COLOR.MEDIA
  return ALERTA_COLOR.SIN_ALERTA
}

function fmt(v) {
  return v !== null && v !== undefined ? parseFloat(v).toFixed(1) : '—'
}

function ordinalGrado(n) {
  return ['','Primero','Segundo','Tercero','Cuarto','Quinto','Sexto'][n] || `${n}°`
}

// ── Render principal ──────────────────────────────────────────────────────────
export async function renderVisualizaciones(container, params = {}) {
  container.innerHTML = `
    <h1>Mapa de Calor Pedagógico</h1>
    <p class="page-desc">
      Promedio por eje temático para cada estudiante, coloreado por nivel de alerta.
    </p>

    <!-- Panel de selectores -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="min-width:180px;margin-bottom:0">
          <label>Periodo</label>
          <select id="sel-periodo" disabled>
            <option value="">Cargando…</option>
          </select>
        </div>
        <div class="form-group" style="min-width:200px;margin-bottom:0">
          <label>Sección</label>
          <select id="sel-seccion" disabled>
            <option value="">Seleccione un periodo</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:160px;margin-bottom:0">
          <label>Buscar estudiante</label>
          <input type="text" id="vz-search" placeholder="Nombre…" disabled>
        </div>
      </div>
    </div>

    <div id="viz-body"></div>
  `

  const selPeriodo = container.querySelector('#sel-periodo')
  const selSeccion = container.querySelector('#sel-seccion')
  const searchInput = container.querySelector('#vz-search')
  const body = container.querySelector('#viz-body')

  let periodos  = []
  let secciones = []
  let anioActivo = null

  // ── Cargar catálogos ──────────────────────────────────────────────────────
  try {
    anioActivo = await getAnioLectivoActivo()
    const [periodosCargados, seccionesRaw] = await Promise.all([
      getPeriodos(anioActivo.id),
      getSecciones(anioActivo.id),
    ])
    periodos  = periodosCargados
    secciones = await filtrarSeccionesPropias(seccionesRaw)

    selPeriodo.innerHTML = '<option value="">— Seleccione un periodo —</option>' +
      periodos.map(p => `<option value="${p.id}">${p.nombre}${p.activo ? ' (activo)' : ''}</option>`).join('')
    selPeriodo.disabled = false

    // Si hay un periodo activo, preseleccionarlo
    // Si viene de alertas tempranas, usar el contexto que trajo
    const periodoInicial = params.periodoId
      ? periodos.find(p => p.id === params.periodoId)
      : periodos.find(p => p.activo)

    if (periodoInicial) {
      selPeriodo.value = periodoInicial.id
      cargarSecciones()

      if (params.seccionId) {
        selSeccion.value = params.seccionId
        await cargarHeatmap(periodoInicial.id, params.seccionId)

        // Filtrar por el nombre del estudiante que viene de alertas
        if (params.estudianteNombre) {
          const primerNombre = params.estudianteNombre.split(' ')[0]
          searchInput.value = primerNombre
          const wrap = container.querySelector('#heatmap-wrap')
          if (wrap?._dibujar) wrap._dibujar(primerNombre.toLowerCase())
        }
      }
    }
  } catch (e) {
    body.innerHTML = `<div class="card" style="color:#dc2626">Error cargando datos: ${e.message}</div>`
    return
  }

  function cargarSecciones() {
    selSeccion.innerHTML = '<option value="">— Seleccione una sección —</option>' +
      secciones.map(s => `<option value="${s.id}">${s.nombre}${s.nivelGrado ? ` (${s.nivelGrado}°)` : ''}${s.docenteNombreCompleto ? ' — ' + s.docenteNombreCompleto : ''}</option>`).join('')
    selSeccion.disabled = false
  }

  selPeriodo.addEventListener('change', () => {
    if (selPeriodo.value) {
      cargarSecciones()
    } else {
      selSeccion.innerHTML = '<option value="">Seleccione un periodo</option>'
      selSeccion.disabled = true
      searchInput.disabled = true
      body.innerHTML = ''
    }
    selSeccion.value = ''
    body.innerHTML = ''
  })

  selSeccion.addEventListener('change', () => {
    if (selPeriodo.value && selSeccion.value) {
      cargarHeatmap(Number(selPeriodo.value), Number(selSeccion.value))
    } else {
      body.innerHTML = ''
    }
  })

  searchInput.addEventListener('input', () => {
    const wrap = container.querySelector('#heatmap-wrap')
    if (wrap && wrap._dibujar) wrap._dibujar(searchInput.value.toLowerCase().trim())
  })

  // ── Mapa de calor ─────────────────────────────────────────────────────────
  async function cargarHeatmap(periodoId, seccionId) {
    const periodo = periodos.find(p => p.id === periodoId)
    const seccion = secciones.find(s => s.id === seccionId)

    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">Cargando datos…</div>`
    searchInput.disabled = true

    try {
      const [matriculas, promedios] = await Promise.all([
        getMatriculasBySeccion(seccionId),
        getPromediosSeccionSaber(seccionId, periodoId).catch(() => []),
      ])

      // Construir columnas (union de todos los ejes evaluados)
      const colMap   = new Map()
      const tipoMeta = new Map()

      for (const res of promedios) {
        for (const ts of (res.promediosPorTipoSaber || [])) {
          tipoMeta.set(ts.tipoSaberId, ts.tipoSaberNombre)
          for (const eje of (ts.promediosPorEje || [])) {
            const key = `${ts.tipoSaberId}-${eje.ejeTemaaticoId}`
            if (!colMap.has(key)) colMap.set(key, {
              key,
              tipoSaberId:     ts.tipoSaberId,
              tipoSaberNombre: ts.tipoSaberNombre,
              ejeTemaaticoId:  eje.ejeTemaaticoId,
              ejeNombre:       eje.ejeNombre,
            })
          }
        }
      }

      const columnas = [...colMap.values()]
        .sort((a, b) => a.tipoSaberId - b.tipoSaberId || a.ejeTemaaticoId - b.ejeTemaaticoId)

      // Agrupar por tipo saber
      const grupos = []
      for (const col of columnas) {
        const last = grupos[grupos.length - 1]
        if (!last || last.tipoSaberId !== col.tipoSaberId)
          grupos.push({ tipoSaberId: col.tipoSaberId, tipoSaberNombre: col.tipoSaberNombre, cols: [col] })
        else last.cols.push(col)
      }

      // Lookup de scores
      const lookup = {}
      const promedioGlobalPorEst = {}
      const alertasPorEst = {}
      for (const res of promedios) {
        lookup[res.estudianteId] = {}
        promedioGlobalPorEst[res.estudianteId] = res.promedioGlobal
        alertasPorEst[res.estudianteId] = {
          altas:  res.totalAlertasAltas  || 0,
          medias: res.totalAlertasMedias || 0,
        }
        for (const ts of (res.promediosPorTipoSaber || [])) {
          for (const eje of (ts.promediosPorEje || [])) {
            const key = `${ts.tipoSaberId}-${eje.ejeTemaaticoId}`
            lookup[res.estudianteId][key] = {
              promedio:    eje.promedio !== null ? parseFloat(eje.promedio) : null,
              nivelAlerta: eje.nivelAlerta,
            }
          }
        }
      }

      const todos = matriculas.map(m => ({
        id:     m.estudianteId,
        nombre: m.estudianteNombreCompleto,
      }))

      // Promedio por columna (fila de totales)
      const colPromedios = {}
      for (const col of columnas) {
        const vals = todos.map(e => lookup[e.id]?.[col.key]?.promedio).filter(v => v !== null && v !== undefined)
        colPromedios[col.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }

      // Sin datos
      if (!columnas.length) {
        body.innerHTML = `
          <div class="card" style="text-align:center;padding:48px 20px">
            <div style="width:44px;height:44px;margin:0 auto 14px;opacity:.35"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg></div>
            <h3 style="margin:0 0 8px">Sin evaluaciones por saber</h3>
            <p style="color:var(--text-muted);margin:0">
              No hay evaluaciones registradas para <strong>${seccion?.nombre}</strong>
              en <strong>${periodo?.nombre}</strong>.<br>
              Registre evaluaciones en <em>Eval. por Saber</em> para ver el mapa.
            </p>
          </div>`
        searchInput.disabled = true
        return
      }

      searchInput.disabled = false

      // Resumen + paneles
      const nAltas  = todos.filter(e => (alertasPorEst[e.id]?.altas  || 0) > 0).length
      const nMedias = todos.filter(e => (alertasPorEst[e.id]?.medias || 0) > 0 && (alertasPorEst[e.id]?.altas || 0) === 0).length

      body.innerHTML = `<div id="heatmap-wrap"></div>`

      const wrap = body.querySelector('#heatmap-wrap')
      const TIPO_COLORS = [
        { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
        { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
        { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
      ]

      function badgesAlerta(alertas) {
        return [
          alertas.altas  > 0 ? `<span class="vz-badge" style="background:#fee2e2;color:#dc2626"><span class="vz-badge-dot" style="background:#dc2626"></span>${alertas.altas}</span>` : '',
          alertas.medias > 0 ? `<span class="vz-badge" style="background:#fef3c7;color:#d97706"><span class="vz-badge-dot" style="background:#f59e0b"></span>${alertas.medias}</span>` : '',
        ].filter(Boolean).join(' ')
      }

      function dibujarTabla(filtro) {
        const estudiantes = filtro
          ? todos.filter(e => e.nombre.toLowerCase().includes(filtro))
          : todos

        if (!estudiantes.length) {
          wrap.innerHTML = '<p class="empty">No hay estudiantes con ese nombre.</p>'
          return
        }

        // ── Tabla resumen fija (sin scroll horizontal) ───────────────
        const totalGlobal = (() => {
          const vals = todos.map(e => promedioGlobalPorEst[e.id]).filter(v => v !== null && v !== undefined)
          return vals.length ? vals.reduce((a, b) => a + parseFloat(b), 0) / vals.length : null
        })()

        const filasResumen = estudiantes.map(est => {
          const global  = promedioGlobalPorEst[est.id]
          const alertas = alertasPorEst[est.id] || { altas: 0, medias: 0 }
          const gC      = colorFromValue(global != null ? parseFloat(global) : null)

          const promediosTipo = grupos.map((g, gi) => {
            const vals = g.cols.map(col => lookup[est.id]?.[col.key]?.promedio).filter(v => v != null)
            const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
            const c    = colorFromValue(avg)
            const tc   = TIPO_COLORS[gi % TIPO_COLORS.length]
            return `<td class="vz-td-score">
              <div class="vz-cell" style="background:${c.bg};color:${c.color};border:1px solid ${c.color}28"
                title="${g.tipoSaberNombre}: ${fmt(avg)}">${fmt(avg)}</div>
            </td>`
          }).join('')

          const badges = badgesAlerta(alertas)
          return `
            <tr>
              <td class="vz-td-name">
                <div class="vz-td-name-inner">
                  <span>${est.nombre}</span>
                  ${badges ? `<div style="display:flex;gap:3px;margin-top:2px">${badges}</div>` : ''}
                </div>
              </td>
              ${promediosTipo}
              <td class="vz-td-score">
                <div class="vz-cell" style="background:${gC.bg};color:${gC.color};font-size:12px;width:54px;border:1px solid ${gC.color}28">${fmt(global ?? null)}</div>
              </td>
            </tr>`
        }).join('')

        const avgTipoRow = grupos.map((g, gi) => {
          const vals = estudiantes.flatMap(e => g.cols.map(col => lookup[e.id]?.[col.key]?.promedio).filter(v => v != null))
          const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
          const c    = colorFromValue(avg)
          return `<td class="vz-td-score"><div class="vz-cell" style="background:${c.bg};color:${c.color}">${fmt(avg)}</div></td>`
        }).join('')
        const tGC = colorFromValue(totalGlobal)

        const cabecerasTipos = grupos.map((g, gi) => {
          const tc = TIPO_COLORS[gi % TIPO_COLORS.length]
          return `<th style="text-align:center;font-size:10px;font-weight:700;color:${tc.color};padding:6px 4px;min-width:54px">${g.tipoSaberNombre.split(' ')[0]}</th>`
        }).join('')

        // ── Paneles de detalle (uno por tipo de saber) ───────────────
        const paneles = grupos.map((g, gi) => {
          const tc = TIPO_COLORS[gi % TIPO_COLORS.length]

          const cabEjes = g.cols.map((col, ci) => `
            <th title="${col.ejeNombre}" class="vz-th-eje" style="color:${tc.color}">${ci + 1}</th>`).join('')

          const ejeLegendsHtml = g.cols.map((col, ci) => `
            <div class="vz-eje-legend-item">
              <span class="vz-eje-legend-num" style="color:${tc.color}">${ci + 1}</span>
              <span>${col.ejeNombre}</span>
            </div>`).join('')

          const filas = estudiantes.map(est => {
            const scores  = lookup[est.id] || {}
            const alertas = alertasPorEst[est.id] || { altas: 0, medias: 0 }
            const celdas  = g.cols.map(col => {
              const val = scores[col.key]?.promedio ?? null
              const c   = colorFromValue(val)
              return `<td class="vz-td-score">
                <div class="vz-cell" style="background:${c.bg};color:${c.color}" title="${col.ejeNombre}: ${fmt(val)}">${fmt(val)}</div>
              </td>`
            }).join('')
            const badges = badgesAlerta(alertas)
            return `
              <tr>
                <td class="vz-td-name">
                  <div class="vz-td-name-inner">
                    <span>${est.nombre}</span>
                    ${badges ? `<div style="display:flex;gap:3px;margin-top:2px">${badges}</div>` : ''}
                  </div>
                </td>
                ${celdas}
              </tr>`
          }).join('')

          const avgRow = g.cols.map(col => {
            const v = colPromedios[col.key]
            const c = colorFromValue(v)
            return `<td class="vz-td-score"><div class="vz-cell" style="background:${c.bg};color:${c.color};opacity:.85">${fmt(v)}</div></td>`
          }).join('')

          return `
            <div class="card vz-panel" data-tipo="${g.tipoSaberId}">
              <div class="vz-panel-head">
                <h3 class="vz-panel-title">
                  <span class="vz-panel-dot" style="background:${tc.color}"></span>
                  ${g.tipoSaberNombre}
                </h3>
                <span class="vz-panel-meta">${g.cols.length} eje${g.cols.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="vz-scroll">
                <table class="vz-table">
                  <thead>
                    <tr>
                      <th class="vz-th-name"></th>
                      ${cabEjes}
                    </tr>
                  </thead>
                  <tbody>
                    ${filas}
                    <tr class="vz-row-avg">
                      <td class="vz-td-name">Promedio grupo</td>
                      ${avgRow}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="vz-eje-legend">${ejeLegendsHtml}</div>
            </div>`
        }).join('')

        const filterTabsHtml = `
          <div class="vz-filter-tabs" id="vz-filter-tabs">
            <button class="vz-filter-tab active" data-filter="todos">Todos</button>
            ${grupos.map((g, gi) => {
              const tc = TIPO_COLORS[gi % TIPO_COLORS.length]
              return `<button class="vz-filter-tab" data-filter="${g.tipoSaberId}" style="--tab-color:${tc.color}">
                <span class="vz-panel-dot" style="background:${tc.color};width:8px;height:8px"></span>
                ${g.tipoSaberNombre}
              </button>`
            }).join('')}
          </div>`

        wrap.innerHTML = `
          <div class="vz-legend">
            <span class="vz-legend-label">Escala:</span>
            ${Object.entries(ALERTA_COLOR).filter(([k]) => k !== 'null').map(([, v]) => `
              <div class="vz-legend-item">
                <div class="vz-legend-swatch" style="background:${v.bg};border:1px solid ${v.color}44"></div>
                <span>${v.label}</span>
              </div>`).join('')}
            <div class="vz-legend-item">
              <div class="vz-legend-swatch" style="background:#f3f4f6;border:1px solid #d1d5db"></div>
              <span>Sin datos</span>
            </div>
          </div>

          ${filterTabsHtml}
          <div class="vz-panels">${paneles}</div>

          <p style="font-size:11px;color:var(--text-muted);margin-top:4px">
            * Promedios de todas las evaluaciones por saber del periodo. Celdas grises = sin evaluar aún.
          </p>`

        wrap.querySelectorAll('#vz-filter-tabs .vz-filter-tab').forEach(btn => {
          btn.addEventListener('click', () => {
            wrap.querySelectorAll('#vz-filter-tabs .vz-filter-tab').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            const f = btn.dataset.filter
            wrap.querySelectorAll('.vz-panel').forEach(panel => {
              panel.style.display = (f === 'todos' || panel.dataset.tipo === f) ? '' : 'none'
            })
          })
        })
      }

      wrap._dibujar = dibujarTabla
      dibujarTabla('')

    } catch (e) {
      body.innerHTML = `<div class="card" style="color:#dc2626">Error cargando datos: ${e.message}</div>`
      searchInput.disabled = true
    }
  }
}
