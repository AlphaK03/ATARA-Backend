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

      // Leyenda + tabla
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <div style="font-size:13px;color:var(--text-muted)">
            ${todos.length} estudiante${todos.length !== 1 ? 's' : ''} · ${columnas.length} eje${columnas.length !== 1 ? 's' : ''} evaluado${columnas.length !== 1 ? 's' : ''}
          </div>
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:12px">
            <span style="font-weight:700;color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em">Escala:</span>
            ${Object.entries(ALERTA_COLOR).filter(([k]) => k !== 'null').map(([, v]) => `
              <div style="display:flex;align-items:center;gap:5px">
                <div style="width:22px;height:16px;border-radius:3px;background:${v.bg};border:1px solid ${v.color}30"></div>
                <span>${v.label}</span>
              </div>`).join('')}
            <div style="display:flex;align-items:center;gap:5px">
              <div style="width:22px;height:16px;border-radius:3px;background:#f3f4f6"></div>
              <span>Sin datos</span>
            </div>
          </div>
        </div>
        <div class="card" style="overflow-x:auto;padding:16px">
          <div id="heatmap-wrap"></div>
        </div>
        <p style="margin-top:10px;font-size:11px;color:var(--text-muted)">
          * Promedios de todas las evaluaciones por saber del periodo. Celdas grises = aún sin evaluar.
        </p>
      `

      const wrap = body.querySelector('#heatmap-wrap')
      const TIPO_COLORS = ['#7c3aed', '#0891b2', '#d97706']

      function dibujarTabla(filtro) {
        const estudiantes = filtro
          ? todos.filter(e => e.nombre.toLowerCase().includes(filtro))
          : todos

        if (!estudiantes.length) {
          wrap.innerHTML = '<p class="empty">No hay estudiantes con ese nombre.</p>'
          return
        }

        const cabGrupos = grupos.map((g, gi) => `
          <th colspan="${g.cols.length}" style="
            text-align:center;padding:8px 6px;font-size:11px;font-weight:700;
            background:${TIPO_COLORS[gi % TIPO_COLORS.length]}18;
            color:${TIPO_COLORS[gi % TIPO_COLORS.length]};
            border-bottom:2px solid ${TIPO_COLORS[gi % TIPO_COLORS.length]};
            white-space:nowrap;
          ">${g.tipoSaberNombre}</th>`).join('')

        const cabEjes = grupos.flatMap((g, gi) =>
          g.cols.map(col => `
            <th title="${col.ejeNombre}" style="
              padding:6px 3px;font-size:10px;font-weight:600;text-align:center;
              color:${TIPO_COLORS[gi % TIPO_COLORS.length]};
              min-width:60px;max-width:60px;word-break:break-word;line-height:1.3;
              border-bottom:none;background:transparent;
            ">
              <div style="max-height:48px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">${col.ejeNombre}</div>
            </th>`)
        ).join('')

        const filas = estudiantes.map(est => {
          const scores  = lookup[est.id] || {}
          const global  = promedioGlobalPorEst[est.id]
          const alertas = alertasPorEst[est.id] || { altas: 0, medias: 0 }

          const celdas = grupos.flatMap(g =>
            g.cols.map(col => {
              const d   = scores[col.key]
              const val = d?.promedio ?? null
              const c   = colorFromValue(val)
              return `
                <td style="padding:3px;text-align:center">
                  <div style="
                    background:${c.bg};color:${c.color};
                    width:56px;height:32px;border-radius:5px;
                    display:flex;align-items:center;justify-content:center;
                    font-size:12px;font-weight:700;margin:0 auto;
                  " title="${col.ejeNombre}: ${fmt(val)}">${fmt(val)}</div>
                </td>`
            })
          ).join('')

          const gC = colorFromValue(global !== undefined ? parseFloat(global) : null)
          const alertaBadges = [
            alertas.altas  > 0 ? `<span style="background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:#dc2626;display:inline-block"></span>${alertas.altas}</span>` : '',
            alertas.medias > 0 ? `<span style="background:#fef3c7;color:#d97706;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px"><span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;display:inline-block"></span>${alertas.medias}</span>` : '',
          ].filter(Boolean).join(' ')

          return `
            <tr style="transition:background .1s" onmouseover="this.style.background='#f8faff'" onmouseout="this.style.background=''">
              <td style="padding:8px 12px;font-weight:500;white-space:nowrap;min-width:160px;font-size:13px">
                ${est.nombre}
                ${alertaBadges ? `<div style="margin-top:3px;display:flex;gap:4px">${alertaBadges}</div>` : ''}
              </td>
              ${celdas}
              <td style="padding:6px 10px;text-align:center">
                <div style="
                  background:${gC.bg};color:${gC.color};
                  padding:4px 10px;border-radius:20px;
                  font-size:12px;font-weight:700;display:inline-block;white-space:nowrap;
                ">${fmt(global ?? null)}</div>
              </td>
            </tr>`
        }).join('')

        const filaTotales = grupos.flatMap(g =>
          g.cols.map(col => {
            const v = colPromedios[col.key]
            const c = colorFromValue(v)
            return `
              <td style="padding:4px 3px;text-align:center;background:#f8faff">
                <div style="
                  background:${c.bg};color:${c.color};
                  width:56px;height:26px;border-radius:5px;
                  display:flex;align-items:center;justify-content:center;
                  font-size:11px;font-weight:700;margin:0 auto;
                ">${fmt(v)}</div>
              </td>`
          })
        ).join('')

        const totalGlobal = (() => {
          const vals = todos.map(e => promedioGlobalPorEst[e.id]).filter(v => v !== undefined && v !== null)
          return vals.length ? vals.reduce((a, b) => a + parseFloat(b), 0) / vals.length : null
        })()
        const tGC = colorFromValue(totalGlobal)

        wrap.innerHTML = `
          <table style="border-collapse:separate;border-spacing:2px;font-size:12px;width:100%">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px 12px;background:transparent;border-bottom:none;min-width:160px"></th>
                ${cabGrupos}
                <th style="padding:8px;background:transparent;border-bottom:none;font-size:11px;color:var(--text-muted);text-align:center;white-space:nowrap">Global</th>
              </tr>
              <tr>
                <th style="background:transparent;border-bottom:1px solid #e5e7eb"></th>
                ${cabEjes}
                <th style="background:transparent;border-bottom:1px solid #e5e7eb"></th>
              </tr>
            </thead>
            <tbody>
              ${filas}
              <tr style="background:#f8faff;border-top:2px solid #e5e7eb">
                <td style="padding:8px 12px;font-size:11px;font-weight:700;color:var(--text-muted)">Promedio del grupo</td>
                ${filaTotales}
                <td style="padding:6px 10px;text-align:center">
                  <div style="
                    background:${tGC.bg};color:${tGC.color};
                    padding:4px 10px;border-radius:20px;
                    font-size:12px;font-weight:700;display:inline-block;
                  ">${fmt(totalGlobal)}</div>
                </td>
              </tr>
            </tbody>
          </table>`
      }

      wrap._dibujar = dibujarTabla
      dibujarTabla('')

    } catch (e) {
      body.innerHTML = `<div class="card" style="color:#dc2626">Error cargando datos: ${e.message}</div>`
      searchInput.disabled = true
    }
  }
}
