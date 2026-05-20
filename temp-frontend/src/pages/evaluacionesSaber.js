/**
 * Evaluaciones por Saber — flujo visual guiado
 *
 * Paso 1: El sistema carga el año activo y muestra sus períodos como tarjetas.
 * Paso 2: Al seleccionar un período, aparecen las secciones del año como tarjetas.
 * Paso 3: Al seleccionar una sección, aparece la lista de estudiantes con estado visual.
 * Paso 4: Click en estudiante → wizard modal para evaluar (o recalificar) cada tipo de saber.
 */

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
// - ejesPorMateriaTipo: depende del nivel de la sección, se recarga al cambiar
//   de sección. Antes era global y mostraba todos los ejes en todos los grados.
let tiposSaber = []
let materias   = []
let ejesPorMateriaTipo = {}  // key: `${materiaId}_${tipoSaberId}`
let ejesNivelCargado   = null  // nivelId del que se cargó ejesPorMateriaTipo

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

    <!-- Breadcrumb de selección -->
    <div id="breadcrumb" style="
      display:flex;gap:8px;align-items:center;flex-wrap:wrap;
      margin-bottom:20px;font-size:13px;
    "></div>

    <!-- Contenido del paso actual -->
    <div id="step-content"></div>

    <style>
      @media (max-width: 768px) {
        #wizard-overlay { align-items: flex-end !important; padding: 0 !important; }
        .wiz-dialog { border-radius: 16px 16px 0 0 !important; width: 100% !important; max-height: 88vh !important; }
        .wiz-header-pad { padding: 14px 16px 0 !important; }
        #wiz-body { padding: 0 14px 8px !important; }
        .wiz-footer { padding: 10px 14px !important; gap: 6px !important; }
        #wiz-steps { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 2px !important; scrollbar-width: none !important; }
        #wiz-steps::-webkit-scrollbar { display: none; }
        .wiz-step-pill { flex: none !important; font-size: 10px !important; padding: 4px 7px !important; white-space: nowrap !important; }
        .wiz-step-sep { flex: none !important; }
        .wiz-niv-row { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
        .niv-btn { padding: 10px 6px !important; min-height: 44px !important; border-radius: 8px !important; font-size: 11px !important; width: 100% !important; box-sizing: border-box !important; line-height: 1.3 !important; }
        .wiz-eje-card { padding: 10px !important; margin-bottom: 8px !important; }
        #wiz-prev, #wiz-next { font-size: 13px !important; padding: 8px 12px !important; }
      }
    </style>

    <!-- Modal wizard de evaluación -->
    <div id="wizard-overlay" style="
      display:none;position:fixed;inset:0;
      background:rgba(0,0,0,0.55);z-index:200;
      align-items:center;justify-content:center;padding:16px;
    ">
      <div class="wiz-dialog" style="
        background:#fff;border-radius:14px;
        width:680px;max-width:100%;max-height:90vh;
        display:flex;flex-direction:column;
        box-shadow:0 24px 64px rgba(0,0,0,0.35);
      ">
        <div class="wiz-header-pad" style="padding:20px 24px 0;flex-shrink:0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
            <div>
              <div id="wiz-modo-label" style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);font-weight:600;margin-bottom:4px">
                Evaluación por saber
              </div>
              <h2 id="wiz-nombre" style="margin:0;font-size:19px;line-height:1.3"></h2>
            </div>
            <button id="wiz-close" style="background:none;border:none;font-size:24px;cursor:pointer;color:#9ca3af;padding:0 0 0 16px;line-height:1" title="Cerrar">&times;</button>
          </div>
          <div id="wiz-steps" style="display:flex;gap:6px;margin-bottom:20px"></div>
        </div>
        <div id="wiz-body" style="padding:0 24px 4px;overflow-y:auto;flex:1"></div>
        <div class="wiz-footer" style="padding:14px 24px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:8px">
          <button id="wiz-prev" class="btn btn-secondary">← Anterior</button>
          <div id="wiz-msg" style="font-size:13px;flex:1;text-align:center"></div>
          <button id="wiz-next" class="btn btn-primary" style="white-space:nowrap">Siguiente →</button>
        </div>
      </div>
    </div>
  `

  // ── Refs ──────────────────────────────────────────────────────────────────
  const breadcrumb  = container.querySelector('#breadcrumb')
  const stepContent = container.querySelector('#step-content')
  const wizOverlay  = container.querySelector('#wizard-overlay')
  const wizNombre   = container.querySelector('#wiz-nombre')
  const wizModoLabel = container.querySelector('#wiz-modo-label')
  const wizSteps    = container.querySelector('#wiz-steps')
  const wizBody     = container.querySelector('#wiz-body')
  const wizPrev     = container.querySelector('#wiz-prev')
  const wizNext     = container.querySelector('#wiz-next')
  const wizMsg      = container.querySelector('#wiz-msg')

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
    const sinEdFisica = allMaterias.filter(m => m.clave !== 'EDUCACION_FISICA')
    materias = await filtrarMateriasPropias(sinEdFisica)
  }

  /**
   * Recarga los ejes temáticos restringidos al grado de la sección activa
   * (V12+). Reemplaza el índice anterior, que era global y mostraba todos
   * los ejes en todos los grados.
   *
   * Requiere {@code seccion.nivelId} (siempre lo provee SeccionResponseDto).
   * Si por alguna razón no llegara, deja el índice vacío y la UI mostrará
   * "Sin ejes en este grado" sin permitir abrir el wizard.
   */
  async function loadEjesParaSeccion(seccion) {
    const nivelId = seccion?.nivelId
    if (nivelId && ejesNivelCargado === nivelId) return  // ya está cargado para este grado

    let allEjes = []
    if (nivelId) {
      try {
        allEjes = await getEjesPorNivel(nivelId)
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
    ejesNivelCargado = nivelId || null
  }

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
      ${i > 0 ? '<span style="color:#d1d5db">›</span>' : ''}
      <span style="
        ${c.action ? 'cursor:pointer;color:var(--primary);text-decoration:underline' : 'color:#374151;font-weight:600'};
        padding:2px 4px;border-radius:4px;
      " data-crumb="${i}">${c.label}</span>
    `).join('')

    breadcrumb.querySelectorAll('[data-crumb]').forEach(el => {
      const i = parseInt(el.dataset.crumb)
      if (crumbs[i].action) el.addEventListener('click', crumbs[i].action)
    })
  }

  // ── Render del paso actual ────────────────────────────────────────────────
  function renderStep() {
    renderBreadcrumb()
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
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
            <div>
              <h2 style="margin:0">Seleccione el período</h2>
              <p style="margin:4px 0 0;font-size:13px;color:var(--text-muted)">
                Año lectivo ${anioActivo.anio} · ${periodos.length} períodos
              </p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
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
                <div class="periodo-card" data-periodo='${JSON.stringify(p)}' style="
                  border:2px solid ${borderColor};border-radius:10px;padding:18px;
                  background:${cardBg};cursor:pointer;
                  transition:box-shadow 0.15s,transform 0.1s;
                ">
                  <div style="font-size:28px;font-weight:800;color:${borderColor};line-height:1;margin-bottom:6px">
                    ${p.numeroPeriodo}
                  </div>
                  <div style="font-weight:600;font-size:14px;margin-bottom:8px;line-height:1.3">${p.nombre}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
                    ${mesCorto(p.fechaInicio)} → ${mesCorto(p.fechaFin)}
                  </div>
                  <span style="
                    display:inline-block;font-size:11px;font-weight:700;
                    padding:3px 10px;border-radius:20px;
                    background:${badgeBg};color:${badgeColor};
                  ">${badgeText}</span>
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
      stepContent.innerHTML = `<div class="card"><p style="color:#dc2626">Error cargando períodos: ${e.message}</p></div>`
    }
  }

  // ── PASO 2: Secciones ─────────────────────────────────────────────────────
  async function renderStepSecciones() {
    stepContent.innerHTML = '<p class="loading">Cargando secciones…</p>'

    try {
      const secciones = await filtrarSeccionesPropias(await getSecciones(anioActivo.id))

      stepContent.innerHTML = `
        <div class="card">
          <div style="margin-bottom:16px">
            <h2 style="margin:0">Seleccione su sección</h2>
            <p style="margin:4px 0 0;font-size:13px;color:var(--text-muted)">
              ${periodoSel.nombre} · ${secciones.length} sección(es) disponibles
            </p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
            ${secciones.map(s => {
              const grado = ordinalGrado(s.nivelGrado)
              const initials = `${s.nivelGrado}${s.nombre}`
              return `
                <div class="seccion-card" data-seccion='${JSON.stringify(s)}' style="
                  border:2px solid var(--primary);border-radius:10px;padding:18px;
                  background:#f8faff;cursor:pointer;
                  transition:box-shadow 0.15s,transform 0.1s;
                ">
                  <div style="display:flex;gap:12px;align-items:flex-start">
                    <div style="
                      width:48px;height:48px;border-radius:10px;flex-shrink:0;
                      background:var(--primary);color:#fff;
                      display:flex;align-items:center;justify-content:center;
                      font-weight:800;font-size:18px;letter-spacing:-1px;
                    ">${initials}</div>
                    <div>
                      <div style="font-weight:700;font-size:16px;margin-bottom:2px">
                        ${grado} · Sección ${s.nombre}
                      </div>
                      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">
                        ${s.centroNombre}
                      </div>
                      ${s.docenteNombreCompleto ? `
                        <div style="font-size:12px;display:flex;align-items:center;gap:4px">
                          <span style="color:#9ca3af">Docente:</span>
                          <span style="font-weight:500">${s.docenteNombreCompleto}</span>
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
      stepContent.innerHTML = `<div class="card"><p style="color:#dc2626">Error cargando secciones: ${e.message}</p></div>`
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

  // ── PASO 3: Grilla de estudiantes ─────────────────────────────────────────
  function renderStepEstudiantes() {
    const matId  = materiaSel?.id
    const tiposEval = tiposEvaluablesParaMateria(matId)
    const total  = tiposEval.length
    const completos  = total === 0 ? 0 : estudiantes.filter(e => {
      const evals = evalsPorEstudiante[e.id] || {}
      return tiposEval.every(t => !!evals[`${matId}_${t.id}`])
    }).length
    const pendientes = estudiantes.length - completos

    stepContent.innerHTML = `
      <div class="card">
        <div class="section-actions">
          <div>
            <h2 style="margin:0">
              ${ordinalGrado(seccionSel.nivelGrado)} · Sección ${seccionSel.nombre}
              <span style="font-size:14px;font-weight:400;color:var(--text-muted);margin-left:8px">${seccionSel.centroNombre}</span>
            </h2>
            <p style="margin:4px 0 0;font-size:13px;color:var(--text-muted)">
              ${periodoSel.nombre} · ${estudiantes.length} estudiantes
              · <span style="color:#16a34a;font-weight:600">${completos} completados</span>
              · <span style="color:#dc2626;font-weight:600">${pendientes} pendientes</span>
            </p>
          </div>
          <div style="display:flex;gap:10px;font-size:12px;align-items:center">
            <span style="display:flex;align-items:center;gap:4px">
              <span style="width:10px;height:10px;border-radius:50%;background:#dc2626;display:inline-block"></span>Sin evaluar
            </span>
            <span style="display:flex;align-items:center;gap:4px">
              <span style="width:10px;height:10px;border-radius:50%;background:#d97706;display:inline-block"></span>Parcial
            </span>
            <span style="display:flex;align-items:center;gap:4px">
              <span style="width:10px;height:10px;border-radius:50%;background:#16a34a;display:inline-block"></span>Completo
            </span>
          </div>
        </div>

        <!-- Tabs de materia -->
        <div id="materia-tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 0">
          ${materias.map(m => {
            const sel = materiaSel?.id === m.id
            return `<button class="mat-tab" data-mat='${JSON.stringify(m)}' style="
              padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;
              cursor:pointer;transition:all 0.15s;
              border:2px solid ${sel ? 'var(--primary)' : '#e5e7eb'};
              background:${sel ? 'var(--primary)' : '#f9fafb'};
              color:${sel ? '#fff' : '#374151'};
            ">${m.nombre}</button>`
          }).join('')}
        </div>

        <div id="student-grid" style="
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(230px,1fr));
          gap:12px;margin-top:16px;
        "></div>
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
    const matId    = materiaSel?.id
    const tiposEval = tiposEvaluablesParaMateria(matId)
    const total    = tiposEval.length

    grid.innerHTML = estudiantes.map(est => {
      const evals = evalsPorEstudiante[est.id] || {}
      const count = tiposEval.filter(t => !!evals[`${matId}_${t.id}`]).length
      const isCompleto = total > 0 && count >= total

      let borderColor, badgeText, badgeBg, cardBg
      if (total === 0) {
        borderColor = '#9ca3af'; badgeText = 'Sin ejes en este grado'; badgeBg = '#f3f4f6'; cardBg = '#f9fafb'
      } else if (count === 0) {
        borderColor = '#dc2626'; badgeText = 'Sin evaluar'; badgeBg = '#fee2e2'; cardBg = '#fff5f5'
      } else if (!isCompleto) {
        borderColor = '#d97706'; badgeText = `${count}/${total} saberes`; badgeBg = '#fef3c7'; cardBg = '#fffdf0'
      } else {
        borderColor = '#16a34a'; badgeText = 'Completo ✓'; badgeBg = '#dcfce7'; cardBg = '#f0fdf4'
      }

      const initials = est.nombreCompleto.split(' ').filter(Boolean)
        .map(w => w[0]).slice(0, 2).join('').toUpperCase()

      const saberChips = tiposEval.map(t => {
        const ev   = evals[`${matId}_${t.id}`]
        const done = !!ev
        // Mostrar promedio del saber si ya fue evaluado
        let promedioLabel = ''
        if (ev?.detalles?.length) {
          const sum = ev.detalles.reduce((acc, d) => acc + d.valor, 0)
          const avg = (sum / ev.detalles.length).toFixed(1)
          promedioLabel = ` · ${avg}`
        }
        return `<span style="
          font-size:10px;padding:2px 7px;border-radius:12px;font-weight:600;
          background:${done ? '#dcfce7' : '#f3f4f6'};
          color:${done ? '#16a34a' : '#9ca3af'};
          border:1px solid ${done ? '#86efac' : '#e5e7eb'};
        ">${done ? '✓' : '○'} ${t.nombre}${promedioLabel}</span>`
      }).join('')

      const accionLabel = isCompleto
        ? `<div style="position:absolute;bottom:10px;right:12px;font-size:11px;color:#16a34a;font-weight:600;display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg> Recalificar</div>`
        : `<div style="position:absolute;bottom:10px;right:12px;font-size:11px;color:${borderColor};font-weight:600">Evaluar →</div>`

      return `
        <div class="s-card" data-est-id="${est.id}" style="
          border:2px solid ${borderColor};border-radius:10px;padding:16px;
          background:${cardBg};cursor:pointer;
          transition:box-shadow 0.15s,transform 0.1s;position:relative;
          user-select:none;
        ">
          <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px">
            <div style="
              width:42px;height:42px;border-radius:50%;flex-shrink:0;
              background:${borderColor};color:#fff;
              display:flex;align-items:center;justify-content:center;
              font-weight:700;font-size:15px;
            ">${initials}</div>
            <div style="min-width:0;flex:1">
              <div style="font-weight:600;font-size:14px;line-height:1.35;word-break:break-word">
                ${est.nombreCompleto}
              </div>
              <span style="
                display:inline-block;margin-top:5px;font-size:11px;font-weight:700;
                padding:2px 9px;border-radius:20px;background:${badgeBg};color:${borderColor};
              ">${badgeText}</span>
            </div>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">${saberChips}</div>
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
        const evals = evalsPorEstudiante[estId] || {}
        const matId = materiaSel?.id
        const tiposEvalClick = tiposEvaluablesParaMateria(matId)
        if (!tiposEvalClick.length) return  // sin ejes en este grado → no abrir wizard
        const count = tiposEvalClick.filter(t => !!evals[`${matId}_${t.id}`]).length
        const isCompleto = count >= tiposEvalClick.length
        openWizard(est, isCompleto ? 'editar' : 'nuevo')
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
    // Ejemplo: Matemáticas en 1° no tiene "Álgebra", así que ese tipo de saber
    // tendría 0 ejes evaluables. Mejor saltarlo que mostrar un wizard vacío.
    const matId = wizMateria?.id
    const tiposConEjes = tiposSaber.filter(t =>
      (ejesPorMateriaTipo[`${matId}_${t.id}`] || []).length > 0
    )

    if (modo === 'nuevo') {
      wizPendientes = tiposConEjes.filter(t => !evals[`${matId}_${t.id}`])
      for (const tipo of wizPendientes) {
        wizRespuestas[tipo.id] = { fecha: today, observacion: '', detalles: {} }
      }
      wizModoLabel.textContent = 'Evaluación por saber'
      wizModoLabel.style.color = 'var(--text-muted)'
      if (!wizPendientes.length) return
      refreshWizardUI()
      wizOverlay.style.display = 'flex'
    } else {
      // Editar: primero mostrar pantalla previa de selección de saberes con
      // promedios y alertas pre-marcadas. showSeleccionSaberes configura
      // wizPendientes / wizRespuestas y arranca el wizard al continuar.
      wizModoLabel.textContent = 'Recalificación'
      wizModoLabel.style.color = '#d97706'
      if (!tiposConEjes.length) return  // grado sin ejes evaluables → no abrir
      showSeleccionSaberes(est, evals, today, tiposConEjes)
    }
  }

  function showSeleccionSaberes(est, evals, today, tiposConEjes = null) {
    const matId = wizMateria?.id
    // Solo mostrar saberes con ejes evaluables en este grado/materia (V12+).
    // Si el caller no provee la lista filtrada, calcularla aquí.
    const tiposDisponibles = tiposConEjes ?? tiposSaber.filter(t =>
      (ejesPorMateriaTipo[`${matId}_${t.id}`] || []).length > 0
    )
    // Construir datos previos para mostrar promedios
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
      <p style="font-size:13px;color:#6b7280;margin:0 0 16px">
        Selecciona los saberes que deseas recalificar. Los no seleccionados se mantienen igual.
      </p>
      ${items.map(item => `
        <label style="
          display:flex;align-items:center;gap:14px;padding:14px;
          border:2px solid #e5e7eb;border-radius:10px;margin-bottom:10px;
          cursor:pointer;transition:border-color .15s;background:#fafafa;
        " class="saber-sel-row" data-tipo-id="${item.tipo.id}">
          <input type="checkbox" class="saber-checkbox" data-tipo-id="${item.tipo.id}"
            style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;flex-shrink:0"
            ${item.promedio !== null && parseFloat(item.promedio) <= 3.0 ? 'checked' : ''}>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:14px">${item.tipo.nombre}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:3px">
              Promedio actual: <strong>${item.promedio !== null ? item.promedio : 'No evaluado'}</strong>
              &nbsp;·&nbsp; ${item.nivelAlerta}
            </div>
          </div>
        </label>
      `).join('')}
      <p style="font-size:11px;color:#9ca3af;margin-top:8px">
        Los saberes con alerta (≤ 3.0) aparecen pre-seleccionados.
      </p>
    `

    // Highlight al hacer hover / check
    wizBody.querySelectorAll('.saber-sel-row').forEach(row => {
      const cb = row.querySelector('.saber-checkbox')
      const update = () => {
        row.style.borderColor = cb.checked ? 'var(--primary)' : '#e5e7eb'
        row.style.background  = cb.checked ? '#f0f7ff' : '#fafafa'
      }
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
      const yaEval = !!evals[`${wizMateria?.id}_${t.id}`] && wizModo === 'editar'
      return `
        <div class="wiz-step-pill" style="
          flex:1;padding:6px 8px;border-radius:6px;
          font-size:12px;font-weight:700;text-align:center;
          background:${active ? 'var(--primary)' : done ? '#dcfce7' : yaEval ? '#fef3c7' : '#f3f4f6'};
          color:${active ? '#fff' : done ? '#16a34a' : yaEval ? '#d97706' : '#9ca3af'};
          border:1px solid ${active ? 'var(--primary)' : done ? '#86efac' : yaEval ? '#fcd34d' : '#e5e7eb'};
        ">${done ? '✓ ' : (i + 1) + '. '}${t.nombre}${yaEval && !done && !active ? ' (editar)' : ''}</div>
        ${i < wizPendientes.length - 1 ? '<div class="wiz-step-sep" style="display:flex;align-items:center;color:#d1d5db;font-size:12px">›</div>' : ''}
      `
    }).join('')

    // Body
    const tipo = wizPendientes[wizStep]
    const ejes = ejesPorMateriaTipo[`${wizMateria?.id}_${tipo.id}`] || []
    const resp = wizRespuestas[tipo.id]
    const isEdit = wizModo === 'editar' && resp.evalId != null

    wizBody.innerHTML = `
      ${isEdit ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 14px;font-size:12px;color:#92400e;margin-bottom:16px;display:flex;align-items:flex-start;gap:8px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="flex-shrink:0;margin-top:1px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>Los valores anteriores serán reemplazados al guardar este saber.</span>
      </div>` : ''}
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
        <div class="form-group" style="min-width:160px;margin-bottom:0">
          <label style="font-size:12px">Fecha de evaluación</label>
          <input type="date" id="wiz-fecha" value="${resp.fecha}">
        </div>
        <div class="form-group" style="flex:1;min-width:200px;margin-bottom:0">
          <label style="font-size:12px">Observación general (opcional)</label>
          <input type="text" id="wiz-obs" placeholder="Comentarios…" value="${resp.observacion || ''}">
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:12px">
        Ejes temáticos — ${tipo.nombre} (${ejes.length} ejes)
      </div>
      ${ejes.map(eje => {
        const cur = resp.detalles[eje.id] || 0
        return `
          <div class="wiz-eje-card" style="margin-bottom:12px;padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa">
            <div style="font-weight:600;font-size:13px;margin-bottom:3px">${eje.nombre}</div>
            ${eje.descripcion ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${eje.descripcion}</div>` : '<div style="margin-bottom:8px"></div>'}
            <div class="wiz-niv-row" style="display:flex;gap:6px;flex-wrap:wrap">
              ${NIVEL_META.slice(1).map((meta, i) => {
                const val = i + 1, sel = cur === val
                return `<button class="niv-btn" data-eje="${eje.id}" data-val="${val}" style="
                  padding:5px 11px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.1s;
                  border:2px solid ${sel ? meta.color : '#e5e7eb'};
                  background:${sel ? meta.bg : '#fff'};
                  color:${sel ? meta.color : '#9ca3af'};
                ">${val}. ${meta.label}</button>`
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
          const bVal = parseInt(b.dataset.val)
          const meta = NIVEL_META[bVal]
          const sel  = bVal === val
          b.style.border     = `2px solid ${sel ? meta.color : '#e5e7eb'}`
          b.style.background = sel ? meta.bg : '#fff'
          b.style.color      = sel ? meta.color : '#9ca3af'
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

      let savedEval
      if (wizModo === 'editar' && resp.evalId != null) {
        savedEval = await updateEvaluacionSaber(resp.evalId, payload)
      } else {
        savedEval = await createEvaluacionSaber(payload)
      }

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
