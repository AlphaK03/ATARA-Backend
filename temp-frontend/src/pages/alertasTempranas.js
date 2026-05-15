/**
 * Alertas Tempranas — rediseño UX
 *
 * - Grid de tarjetas por estudiante (no collapsible)
 * - Modal ligero con el desglose completo por eje
 * - Filtros simplificados + chips de nivel en el resumen
 */

import {
  getAnioLectivoActivo,
  getPeriodos,
  getSecciones,
  filtrarSeccionesPropias,
  filtrarMateriasPropias,
  getMaterias,
  getAlertasTematicasSeccion,
  generarAlertasTematicasSeccion,
} from '../api.js'
import { saveFilters, loadFilters } from '../utils/storage.js'

const FILTER_KEY = 'alertasTempranas'

const NIVEL = {
  ALTA:  { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: 'Riesgo alto',  dot: '#dc2626' },
  MEDIA: { bg: '#fef9c3', color: '#ca8a04', border: '#fde047', label: 'Riesgo medio', dot: '#f59e0b' },
}

const _SVG = {
  book:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2V4z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8V4z"/></svg>`,
  cog:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>`,
  heart:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  clipboard:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  refresh:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  chart:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>`,
  users:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  alertCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  warning:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  search:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
}

const _ico  = (name, size = 14) => `<span style="display:inline-flex;width:${size}px;height:${size}px;flex-shrink:0">${_SVG[name]}</span>`
const _dot  = (color, size = 8)  => `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};flex-shrink:0"></span>`
const _spin = () => `<span style="display:inline-block;width:28px;height:28px;border:3px solid #e5e7eb;border-top-color:#3b7dd8;border-radius:50%;animation:spin 0.65s linear infinite"></span>`

const TIPO_META = {
  'Saber Conceptual':    { icon: 'book',      short: 'Conceptual',    color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
  'Saber Procedimental': { icon: 'cog',       short: 'Procedimental', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  'Saber Actitudinal':   { icon: 'heart',     short: 'Actitudinal',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
}
function tipoMeta(n) {
  return TIPO_META[n] || { icon: 'clipboard', short: n, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' }
}

// ─── render principal ─────────────────────────────────────────────────────────
export async function renderAlertasTempranas(container) {
  container.innerHTML = `
    <h1>Alertas Tempranas</h1>
    <p class="page-desc">
      Revisión rápida del estado pedagógico por estudiante.
      Las tarjetas en rojo requieren atención prioritaria.
    </p>

    <!-- Barra de controles -->
    <div class="card" style="padding:14px 18px;margin-bottom:16px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="min-width:170px;margin:0">
          <label>Periodo</label>
          <select id="sel-periodo" disabled><option>Cargando…</option></select>
        </div>
        <div class="form-group" style="min-width:190px;margin:0">
          <label>Sección <span style="font-size:11px;color:var(--text-muted)">(opcional)</span></label>
          <select id="sel-seccion" disabled><option value="">Todas las secciones</option></select>
        </div>
        <div class="form-group" style="flex:1;min-width:160px;margin:0">
          <label>Buscar estudiante</label>
          <input type="text" id="f-nombre" placeholder="Escriba un nombre…" disabled
            style="width:100%">
        </div>
        <button class="btn btn-secondary btn-sm" id="f-clear" style="height:36px" disabled>Limpiar</button>
        <button class="btn btn-primary   btn-sm" id="btn-generar" style="height:36px" disabled>${_ico('refresh',13)} Regenerar</button>
      </div>
    </div>

    <!-- Resumen de chips clicables -->
    <div id="resumen-strip" style="display:none"></div>

    <!-- Tabs de materia -->
    <div id="materia-tabs" style="display:none;gap:6px;flex-wrap:wrap;margin-bottom:12px"></div>

    <!-- Contador + orden -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <span id="alerta-count" style="font-size:13px;color:var(--text-muted)"></span>
      <div id="nivel-tabs" style="display:flex;gap:6px"></div>
    </div>

    <!-- Grid de tarjetas -->
    <div id="alertas-body"></div>

    <!-- Modal de detalle -->
    <div id="det-overlay" style="
      display:none;position:fixed;inset:0;
      background:rgba(0,0,0,0.45);z-index:300;
      align-items:center;justify-content:center;padding:16px;
    ">
      <div id="det-panel" style="
        background:#fff;border-radius:14px;width:560px;
        max-width:100%;max-height:88vh;display:flex;flex-direction:column;
        box-shadow:0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="padding:20px 22px 0;flex-shrink:0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <div>
              <div id="det-badge" style="display:inline-block;margin-bottom:8px;
                padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700"></div>
              <h2 id="det-nombre" style="margin:0;font-size:18px;line-height:1.3"></h2>
            </div>
            <button id="det-close" style="
              background:none;border:none;font-size:22px;cursor:pointer;
              color:#9ca3af;padding:0 0 0 16px;line-height:1;flex-shrink:0
            " title="Cerrar">&times;</button>
          </div>
          <div id="det-meta" style="font-size:12px;color:var(--text-muted);margin-bottom:16px"></div>
        </div>
        <div id="det-body" style="padding:0 22px 6px;overflow-y:auto;flex:1"></div>
        <div style="padding:14px 22px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <button id="det-viz" class="btn btn-secondary btn-sm">${_ico('chart',13)} Ver mapa de calor</button>
          <button id="det-close2" class="btn btn-primary btn-sm">Cerrar</button>
        </div>
      </div>
    </div>

    <style>
      .at-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
      }
      .at-card {
        background: #fff;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
        border-left-width: 5px;
        padding: 16px;
        transition: box-shadow .15s, transform .1s;
        cursor: default;
        position: relative;
      }
      .at-card:hover {
        box-shadow: 0 4px 16px rgba(0,0,0,0.10);
        transform: translateY(-1px);
      }
      .at-card.alta  { border-left-color:#dc2626; background:#fffafa; }
      .at-card.media { border-left-color:#f59e0b; background:#fffef5; }
      .at-risk-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .at-risk-badge.alta  { background:#fee2e2; color:#dc2626; }
      .at-risk-badge.media { background:#fef3c7; color:#b45309; }
      .at-student-name {
        font-size: 15px;
        font-weight: 700;
        color: #1a1d23;
        margin-bottom: 12px;
        line-height: 1.3;
      }
      .at-saber-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .at-saber-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .at-saber-label {
        font-size: 12px;
        color: #6b7280;
        flex: 1;
      }
      .at-saber-count {
        font-size: 11px;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: 20px;
      }
      .at-btn-detail {
        margin-top: 14px;
        width: 100%;
        padding: 8px;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        background: #f9fafb;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: background .12s;
      }
      .at-btn-detail:hover { background: #f3f4f6; }

      /* Modal detail */
      .det-tipo-block {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      .det-tipo-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        font-size: 13px;
        font-weight: 700;
      }
      .det-eje-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-top: 1px solid #f3f4f6;
      }
      .det-eje-nombre {
        flex: 1;
        font-size: 13px;
        color: #374151;
      }
      .det-bar-wrap {
        width: 80px;
        height: 7px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .det-bar-fill {
        height: 100%;
        border-radius: 4px;
      }
      .det-score {
        font-size: 13px;
        font-weight: 700;
        width: 30px;
        text-align: right;
        flex-shrink: 0;
      }
      .det-nivel-pill {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 20px;
        flex-shrink: 0;
      }

      /* Chips de nivel activo */
      .at-nivel-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all .12s;
      }
      .at-nivel-chip.active { border-color: currentColor; }
    </style>
  `

  const selPeriodo  = container.querySelector('#sel-periodo')
  const selSeccion  = container.querySelector('#sel-seccion')
  const inputNombre = container.querySelector('#f-nombre')
  const btnClear    = container.querySelector('#f-clear')
  const btnGenerar  = container.querySelector('#btn-generar')
  const resumenEl   = container.querySelector('#resumen-strip')
  const body        = container.querySelector('#alertas-body')
  const countEl     = container.querySelector('#alerta-count')
  const nivelTabs   = container.querySelector('#nivel-tabs')

  // Modal
  const overlay    = container.querySelector('#det-overlay')
  const detNombre  = container.querySelector('#det-nombre')
  const detBadge   = container.querySelector('#det-badge')
  const detMeta    = container.querySelector('#det-meta')
  const detBody    = container.querySelector('#det-body')
  const detClose   = container.querySelector('#det-close')
  const detClose2  = container.querySelector('#det-close2')
  const detVizBtn  = container.querySelector('#det-viz')

  let periodos  = []
  let secciones = []
  let materiasList = []
  let alertas   = []
  let nivelFiltro   = ''   // '' | 'ALTA' | 'MEDIA'
  let materiaFiltro = 0    // 0 = todas, else materiaId
  let detEstRef  = null    // para navegar desde el modal

  const materiasTabsEl = container.querySelector('#materia-tabs')

  function closeModal() { overlay.style.display = 'none'; detEstRef = null }
  detClose.addEventListener('click', closeModal)
  detClose2.addEventListener('click', closeModal)
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() })

  detVizBtn.addEventListener('click', () => {
    if (!detEstRef) return
    const est = detEstRef
    const ref = alertas.find(a => a.estudianteId === est.id)
    closeModal()
    window.dispatchEvent(new CustomEvent('atara:navigate', {
      detail: {
        page: 'visualizaciones',
        params: {
          periodoId:        ref?.periodoId,
          seccionId:        ref?._seccionId,
          estudianteNombre: est.nombre,
        },
      },
    }))
  })

  // ── Catálogos ─────────────────────────────────────────────────────────────
  try {
    const anio = await getAnioLectivoActivo()
    let allMaterias
    let rawSecciones
    ;[periodos, rawSecciones, allMaterias] = await Promise.all([
      getPeriodos(anio.id),
      getSecciones(anio.id),
      getMaterias().catch(() => []),
    ])
    secciones = await filtrarSeccionesPropias(rawSecciones)
    const sinEdFisica = allMaterias.filter(m => m.clave !== 'EDUCACION_FISICA')
    materiasList = await filtrarMateriasPropias(sinEdFisica)
    selPeriodo.innerHTML = '<option value="">— Seleccione un periodo —</option>' +
      periodos.map(p => `<option value="${p.id}">${p.nombre}${p.activo ? ' (activo)' : ''}</option>`).join('')
    selPeriodo.disabled = false

    selSeccion.innerHTML = '<option value="">Todas las secciones</option>' +
      secciones.map(s =>
        `<option value="${s.id}">${s.nombre}${s.nivelGrado ? ` (${s.nivelGrado}°)` : ''}${s.docenteNombreCompleto ? ' — ' + s.docenteNombreCompleto : ''}</option>`
      ).join('')
    selSeccion.disabled = false

    const saved = loadFilters(FILTER_KEY)
    const activo = periodos.find(p => p.activo)
    if (saved.periodoId && periodos.find(p => String(p.id) === String(saved.periodoId))) {
      selPeriodo.value = saved.periodoId
    } else if (activo) {
      selPeriodo.value = activo.id
    }
    if (saved.seccionId && secciones.find(s => String(s.id) === String(saved.seccionId))) {
      selSeccion.value = saved.seccionId
    }
    if (selPeriodo.value) cargarAlertas()
  } catch (e) {
    body.innerHTML = `<div class="card" style="color:#dc2626">Error al cargar: ${e.message}</div>`
    return
  }

  // ── Eventos ───────────────────────────────────────────────────────────────
  selPeriodo.addEventListener('change', () => {
    nivelFiltro = ''; inputNombre.value = ''
    saveFilters(FILTER_KEY, { periodoId: selPeriodo.value, seccionId: selSeccion.value })
    if (selPeriodo.value) cargarAlertas()
    else { alertas = []; renderLista(); resumenEl.style.display = 'none' }
  })
  selSeccion.addEventListener('change', () => {
    nivelFiltro = ''; inputNombre.value = ''
    saveFilters(FILTER_KEY, { periodoId: selPeriodo.value, seccionId: selSeccion.value })
    if (selPeriodo.value) cargarAlertas()
  })
  inputNombre.addEventListener('input', renderLista)
  btnClear.addEventListener('click', () => {
    nivelFiltro = ''; materiaFiltro = 0; inputNombre.value = ''
    renderNivelTabs(); renderMateriaTabs(); renderLista()
  })
  btnGenerar.addEventListener('click', async () => {
    const seccionId = Number(selSeccion.value) || null
    const periodoId = Number(selPeriodo.value)
    if (!periodoId) return
    btnGenerar.disabled = true; btnGenerar.innerHTML = 'Generando…'
    try {
      if (seccionId) {
        alertas = (await generarAlertasTematicasSeccion(seccionId, periodoId))
          .map(a => ({ ...a, _seccionId: seccionId }))
      } else {
        const res = await Promise.all(
          secciones.map(s =>
            generarAlertasTematicasSeccion(s.id, periodoId)
              .then(arr => arr.map(a => ({ ...a, _seccionId: s.id })))
              .catch(() => [])
          )
        )
        alertas = res.flat()
      }
      actualizarResumen(); renderNivelTabs(); renderMateriaTabs(); renderLista()
    } catch (e) { alert(`Error al regenerar: ${e.message}`) }
    finally { btnGenerar.disabled = false; btnGenerar.innerHTML = `${_ico('refresh',13)} Regenerar` }
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  function setControles(on) {
    inputNombre.disabled = !on; btnClear.disabled = !on
    btnGenerar.disabled = !on || !selPeriodo.value
  }

  // ── Carga ─────────────────────────────────────────────────────────────────
  async function cargarAlertas() {
    const periodoId = Number(selPeriodo.value)
    const seccionId = Number(selSeccion.value) || null
    if (!periodoId) return
    body.innerHTML = `
      <div class="loading-center">
        ${_spin()}
        <div>Cargando alertas…</div>
      </div>`
    setControles(false)
    try {
      if (seccionId) {
        alertas = (await getAlertasTematicasSeccion(seccionId, periodoId))
          .map(a => ({ ...a, _seccionId: seccionId }))
      } else {
        const res = await Promise.all(
          secciones.map(s =>
            getAlertasTematicasSeccion(s.id, periodoId)
              .then(arr => arr.map(a => ({ ...a, _seccionId: s.id })))
              .catch(() => [])
          )
        )
        alertas = res.flat()
      }
      setControles(true); actualizarResumen(); renderNivelTabs(); renderMateriaTabs(); renderLista()
    } catch (e) {
      body.innerHTML = `<div class="card" style="color:#dc2626">Error: ${e.message}</div>`
    }
  }

  // ── Resumen de chips ──────────────────────────────────────────────────────
  function actualizarResumen() {
    const nAlta  = alertas.filter(a => a.nivelAlerta === 'ALTA').length
    const nMedia = alertas.filter(a => a.nivelAlerta === 'MEDIA').length
    const nEst   = new Set(alertas.map(a => a.estudianteId)).size
    const nEstA  = new Set(alertas.filter(a => a.nivelAlerta === 'ALTA').map(a => a.estudianteId)).size

    resumenEl.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:20px'
    resumenEl.innerHTML = [
      { val: nEst,   sub: 'con alertas',       icon: 'users',       col: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
      { val: nEstA,  sub: 'en riesgo alto',    icon: 'alertCircle', col: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
      { val: nAlta,  sub: 'alertas altas',     icon: 'alertCircle', col: '#dc2626', bg: '#fff1f2', border: '#fecdd3' },
      { val: nMedia, sub: 'alertas medias',    icon: 'warning',     col: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    ].map(({ val, sub, icon, col, bg, border }) => `
      <div style="padding:14px 16px;border-radius:8px;background:${bg};border:1px solid ${border}">
        <div style="font-size:28px;font-weight:900;color:${col};line-height:1">${val}</div>
        <div style="font-size:11px;color:${col};font-weight:600;margin-top:6px;display:flex;align-items:center;gap:5px">
          <span style="display:inline-flex;width:13px;height:13px;flex-shrink:0">${_SVG[icon]}</span>
          ${sub}
        </div>
      </div>`).join('')
  }

  // ── Tabs de filtro por materia ────────────────────────────────────────────
  function renderMateriaTabs() {
    if (!materiasList.length) { materiasTabsEl.style.display = 'none'; return }
    materiasTabsEl.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px'
    materiasTabsEl.innerHTML = [{ id: 0, nombre: 'Todas las materias' }, ...materiasList].map(m => {
      const sel = materiaFiltro === m.id
      return `<button class="at-mat-chip" data-mid="${m.id}" style="
        padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;
        cursor:pointer;transition:all .12s;
        border:2px solid ${sel ? 'var(--primary)' : '#e5e7eb'};
        background:${sel ? 'var(--primary)' : '#f9fafb'};
        color:${sel ? '#fff' : '#374151'};
      ">${m.nombre}</button>`
    }).join('')
    materiasTabsEl.querySelectorAll('.at-mat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        materiaFiltro = Number(btn.dataset.mid)
        renderMateriaTabs(); renderLista()
      })
    })
  }

  // ── Chips de filtro por nivel ─────────────────────────────────────────────
  function renderNivelTabs() {
    nivelTabs.innerHTML = [
      { val: '', label: 'Todos' },
      { val: 'ALTA',  label: `${_dot('#dc2626',8)} Alto` },
      { val: 'MEDIA', label: `${_dot('#f59e0b',8)} Medio` },
    ].map(({ val, label }) => {
      const active = nivelFiltro === val
      const styles = val === 'ALTA'
        ? `background:${active?'#dc2626':'#fee2e2'};color:${active?'#fff':'#dc2626'}`
        : val === 'MEDIA'
        ? `background:${active?'#f59e0b':'#fef3c7'};color:${active?'#fff':'#b45309'}`
        : `background:${active?'#4f46e5':'#eef2ff'};color:${active?'#fff':'#4f46e5'}`
      return `<button class="at-nivel-chip${active?' active':''}" data-nivel="${val}"
        style="${styles}">${label}</button>`
    }).join('')
    nivelTabs.querySelectorAll('.at-nivel-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        nivelFiltro = btn.dataset.nivel
        renderNivelTabs(); renderLista()
      })
    })
  }

  // ── Grid filtrado ─────────────────────────────────────────────────────────
  function renderLista() {
    const nombre = inputNombre.value.trim().toLowerCase()

    const filtered = alertas.filter(a =>
      (!nivelFiltro   || a.nivelAlerta === nivelFiltro) &&
      (!materiaFiltro || a.materiaId   === materiaFiltro) &&
      (!nombre        || a.estudianteNombreCompleto.toLowerCase().includes(nombre))
    )

    const porEst = new Map()
    filtered.forEach(a => {
      if (!porEst.has(a.estudianteId))
        porEst.set(a.estudianteId, { id: a.estudianteId, nombre: a.estudianteNombreCompleto, alertas: [] })
      porEst.get(a.estudianteId).alertas.push(a)
    })

    const sorted = [...porEst.values()].sort((x, y) => {
      const xA = x.alertas.some(a => a.nivelAlerta === 'ALTA') ? 0 : 1
      const yA = y.alertas.some(a => a.nivelAlerta === 'ALTA') ? 0 : 1
      return xA - yA || x.nombre.localeCompare(y.nombre)
    })

    countEl.textContent = sorted.length
      ? `${sorted.length} estudiante${sorted.length !== 1 ? 's' : ''} encontrado${sorted.length !== 1 ? 's' : ''}`
      : ''

    if (!sorted.length) {
      body.innerHTML = alertas.length
        ? `<div class="card" style="text-align:center;padding:40px;color:var(--text-muted)">
            <div style="width:36px;height:36px;margin:0 auto 12px;opacity:.4">${_SVG.search}</div>
            <div style="font-weight:600">No hay resultados con los filtros aplicados</div>
           </div>`
        : `<div class="card" style="text-align:center;padding:50px 20px;color:var(--text-muted)">
            <div style="width:44px;height:44px;margin:0 auto 12px;color:#16a34a">${_SVG.checkCircle}</div>
            <div style="font-size:16px;font-weight:700;margin-bottom:6px;color:#374151">Sin alertas registradas</div>
            <div style="font-size:13px">
              No hay alertas para este periodo.<br>
              Presione <strong>Regenerar</strong> para calcularlas desde las evaluaciones.
            </div>
           </div>`
      return
    }

    body.innerHTML = `<div class="at-grid">${sorted.map(est => cardHtml(est)).join('')}</div>`

    body.querySelectorAll('[data-det-est]').forEach(btn => {
      btn.addEventListener('click', () => {
        const est = porEst.get(Number(btn.dataset.detEst))
        if (est) openModal(est)
      })
    })
  }

  // ── Tarjeta de estudiante ─────────────────────────────────────────────────
  function cardHtml(est) {
    const tieneAlta = est.alertas.some(a => a.nivelAlerta === 'ALTA')
    const nAlta     = est.alertas.filter(a => a.nivelAlerta === 'ALTA').length
    const nMedia    = est.alertas.filter(a => a.nivelAlerta === 'MEDIA').length
    const cls       = tieneAlta ? 'alta' : 'media'

    // Agrupa por materia+tipo para las mini-filas
    const porTipo = new Map()
    est.alertas.forEach(a => {
      const key = `${a.materiaNombre || ''}_${a.tipoSaberNombre}`
      const label = a.materiaNombre ? `${a.materiaNombre} · ${a.tipoSaberNombre}` : a.tipoSaberNombre
      if (!porTipo.has(key)) porTipo.set(key, { label, tipoNombre: a.tipoSaberNombre, alta: 0, media: 0 })
      const g = porTipo.get(key)
      if (a.nivelAlerta === 'ALTA') g.alta++; else g.media++
    })

    const saberRows = [...porTipo.entries()].map(([, g]) => {
      const m   = tipoMeta(g.tipoNombre)
      const col = g.alta > 0 ? '#dc2626' : '#f59e0b'
      return `
        <div class="at-saber-row">
          <span style="display:inline-flex;width:13px;height:13px;flex-shrink:0;color:${m.color}">${_SVG[m.icon]}</span>
          <span class="at-saber-label" style="font-size:11px">${g.label}</span>
          <span class="at-saber-count" style="background:${col}18;color:${col};display:inline-flex;align-items:center;gap:4px">
            ${g.alta  ? `${_dot('#dc2626',6)}${g.alta}`  : ''}
            ${g.alta && g.media ? ' ' : ''}
            ${g.media ? `${_dot('#f59e0b',6)}${g.media}` : ''}
          </span>
        </div>`
    }).join('')

    const badgeTxt = tieneAlta
      ? `${_ico('alertCircle',12)} Riesgo alto`
      : `${_ico('warning',12)} Riesgo medio`

    // initials avatar
    const parts = est.nombre.trim().split(' ')
    const avatar = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : est.nombre.slice(0, 2).toUpperCase()

    return `
      <div class="at-card ${cls}">
        <div class="at-risk-badge ${cls}">${badgeTxt}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="
            width:38px;height:38px;border-radius:50%;flex-shrink:0;
            background:${tieneAlta ? '#fee2e2' : '#fef3c7'};
            color:${tieneAlta ? '#dc2626' : '#b45309'};
            display:flex;align-items:center;justify-content:center;
            font-weight:800;font-size:14px;border:2px solid ${tieneAlta ? '#fca5a5' : '#fde047'};
          ">${avatar}</div>
          <div class="at-student-name" style="margin:0">${est.nombre}</div>
        </div>

        <div style="margin-bottom:4px">${saberRows}</div>

        <div style="display:flex;gap:6px;margin-top:12px;margin-bottom:2px">
          ${nAlta  ? `<span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:#fee2e2;color:#dc2626;display:inline-flex;align-items:center;gap:4px">${_dot('#dc2626',6)}${nAlta} alta${nAlta!==1?'s':''}</span>` : ''}
          ${nMedia ? `<span style="font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;background:#fef3c7;color:#b45309;display:inline-flex;align-items:center;gap:4px">${_dot('#f59e0b',6)}${nMedia} media${nMedia!==1?'s':''}</span>` : ''}
        </div>

        <button class="at-btn-detail" data-det-est="${est.id}">
          Ver detalle completo →
        </button>
      </div>`
  }

  // ── Modal de detalle ──────────────────────────────────────────────────────
  function openModal(est) {
    detEstRef = est
    const tieneAlta = est.alertas.some(a => a.nivelAlerta === 'ALTA')
    const nAlta     = est.alertas.filter(a => a.nivelAlerta === 'ALTA').length
    const nMedia    = est.alertas.filter(a => a.nivelAlerta === 'MEDIA').length

    detNombre.textContent = est.nombre
    detBadge.className = `at-risk-badge ${tieneAlta ? 'alta' : 'media'}`
    detBadge.innerHTML = tieneAlta
      ? `${_ico('alertCircle',13)} Riesgo alto`
      : `${_ico('warning',13)} Riesgo medio`
    detMeta.innerHTML = [
      nAlta  ? `<strong style="color:#dc2626">${nAlta} alerta${nAlta!==1?'s':''} alta${nAlta!==1?'s':''}</strong>` : '',
      nMedia ? `<strong style="color:#b45309">${nMedia} alerta${nMedia!==1?'s':''} media${nMedia!==1?'s':''}</strong>` : '',
    ].filter(Boolean).join(' · ')

    // Agrupar por materia → tipo
    const porMateriaTipo = new Map()
    est.alertas.forEach(a => {
      const key   = `${a.materiaNombre || 'Sin materia'}_${a.tipoSaberNombre}`
      const label = a.materiaNombre ? `${a.materiaNombre} — ${a.tipoSaberNombre}` : a.tipoSaberNombre
      if (!porMateriaTipo.has(key)) porMateriaTipo.set(key, { label, tipoNombre: a.tipoSaberNombre, alertas: [] })
      porMateriaTipo.get(key).alertas.push(a)
    })

    detBody.innerHTML = [...porMateriaTipo.entries()].map(([, entry]) => {
      const tipo  = entry.tipoNombre
      const lista = entry.alertas
      const m    = tipoMeta(tipo)
      const rows = lista
        .sort((x, y) => (x.nivelAlerta === 'ALTA' ? 0 : 1) - (y.nivelAlerta === 'ALTA' ? 0 : 1))
        .map(a => {
          const nv  = NIVEL[a.nivelAlerta] || {}
          const pct = Math.round(Number(a.promedio) / 5 * 100)
          return `
            <div class="det-eje-row">
              <div class="det-eje-nombre">${a.ejeNombre}</div>
              <div class="det-bar-wrap">
                <div class="det-bar-fill" style="width:${pct}%;background:${nv.color || '#9ca3af'}"></div>
              </div>
              <div class="det-score" style="color:${nv.color || '#6b7280'}">${Number(a.promedio).toFixed(1)}</div>
              <div class="det-nivel-pill" style="background:${nv.bg};color:${nv.color};border:1px solid ${nv.border};display:inline-flex;align-items:center;gap:4px">
                ${a.nivelAlerta === 'ALTA' ? `${_dot('#dc2626',7)} Alta` : `${_dot('#f59e0b',7)} Media`}
              </div>
            </div>`
        }).join('')

      return `
        <div class="det-tipo-block">
          <div class="det-tipo-header" style="background:${m.bg};color:${m.color}">
            <span style="display:inline-flex;width:16px;height:16px;flex-shrink:0">${_SVG[m.icon]}</span>
            <span>${entry.label}</span>
            <span style="font-size:11px;font-weight:400;color:${m.color};opacity:.7;margin-left:4px">
              ${lista.length} alerta${lista.length!==1?'s':''}
            </span>
          </div>
          ${rows}
        </div>`
    }).join('')

    overlay.style.display = 'flex'
  }
}
