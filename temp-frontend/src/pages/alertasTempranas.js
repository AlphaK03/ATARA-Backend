/**
 * Alertas Tempranas — vista calmada y compacta
 *
 * Diseño: paleta neutra (blanco/gris) con acentos rojos/ámbar mínimos.
 * El color se usa solo donde aporta significado (severidad), no como decoración.
 *
 * - Resumen en 4 tarjetas neutras con barra de acento lateral.
 * - Grid de tarjetas por estudiante: borde lateral de 3px como única señal de severidad.
 * - Modal con bloques agrupados por materia/saber y barra de progreso sutil por eje.
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

const _SVG = {
  refresh:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  search:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
}

const _ico  = (name, size = 14) => `<span style="display:inline-flex;width:${size}px;height:${size}px;flex-shrink:0">${_SVG[name]}</span>`
const _spin = () => `<span style="display:inline-block;width:28px;height:28px;border:3px solid #e5e7eb;border-top-color:#990000;border-radius:50%;animation:spin 0.65s linear infinite"></span>`

// ─── render principal ─────────────────────────────────────────────────────────
export async function renderAlertasTempranas(container) {
  container.innerHTML = `
    <h1>Alertas Tempranas</h1>
    <p class="page-desc">Estado pedagógico por estudiante. Las tarjetas marcadas en rojo requieren atención prioritaria.</p>

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
        <button class="btn btn-primary   btn-sm" id="btn-generar" style="height:36px" disabled>${_ico('refresh',13)} Actualizar alertas</button>
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
      background:rgba(15,23,42,0.40);z-index:300;
      align-items:center;justify-content:center;padding:16px;
    ">
      <div id="det-panel" style="
        background:#fff;border-radius:12px;width:560px;
        max-width:100%;max-height:88vh;display:flex;flex-direction:column;
        box-shadow:0 10px 40px rgba(0,0,0,0.18);
      ">
        <div style="padding:18px 22px;border-bottom:1px solid #f3f4f6;flex-shrink:0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="min-width:0">
              <span id="det-badge" class="det-badge"></span>
              <h2 id="det-nombre" style="margin:8px 0 0;font-size:17px;line-height:1.3;color:#1f2937;font-weight:600"></h2>
              <div id="det-meta" style="font-size:12px;color:#6b7280;margin-top:4px"></div>
            </div>
            <button id="det-close" style="
              background:none;border:none;font-size:22px;cursor:pointer;
              color:#9ca3af;padding:0;line-height:1;flex-shrink:0
            " title="Cerrar">&times;</button>
          </div>
        </div>
        <div id="det-body" style="padding:14px 22px;overflow-y:auto;flex:1;background:#fafbfc"></div>
        <div style="padding:12px 22px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <button id="det-viz" class="btn btn-secondary btn-sm">Ver mapa de calor</button>
          <button id="det-close2" class="btn btn-primary btn-sm">Cerrar</button>
        </div>
      </div>
    </div>

    <style>
      /* ── Resumen ─────────────────────────────────────────── */
      .at-stat {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }
      .at-stat-bar {
        width: 4px;
        height: 34px;
        border-radius: 2px;
        flex-shrink: 0;
        background: #d1d5db;
      }
      .at-stat-bar.alta  { background: #dc2626; }
      .at-stat-bar.media { background: #d97706; }
      .at-stat-num {
        font-size: 22px;
        font-weight: 600;
        color: #1f2937;
        line-height: 1.1;
      }
      .at-stat-lbl {
        font-size: 11px;
        color: #6b7280;
        margin-top: 4px;
      }

      /* ── Grid + tarjeta ─────────────────────────────────── */
      .at-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
        gap: 12px;
      }
      .at-card {
        position: relative;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 14px 16px 12px 18px;
        transition: border-color .15s, box-shadow .15s;
      }
      .at-card::before {
        content: '';
        position: absolute;
        left: 0; top: 14px; bottom: 14px;
        width: 3px;
        border-radius: 0 2px 2px 0;
        background: #d1d5db;
      }
      .at-card.alta::before  { background: #dc2626; }
      .at-card.media::before { background: #d97706; }
      .at-card:hover {
        border-color: #d1d5db;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      .at-card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 11px;
      }
      .at-sev {
        font-weight: 700;
        letter-spacing: .4px;
        text-transform: uppercase;
      }
      .at-sev.alta  { color: #b91c1c; }
      .at-sev.media { color: #92400e; }
      .at-card-meta { color: #9ca3af; }
      .at-card-name {
        font-size: 15px;
        font-weight: 600;
        color: #1f2937;
        line-height: 1.3;
        margin-bottom: 10px;
      }
      .at-saber-list {
        list-style: none;
        margin: 0; padding: 0;
        border-top: 1px solid #f3f4f6;
      }
      .at-saber-list li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 0;
        font-size: 12px;
        border-bottom: 1px solid #f3f4f6;
      }
      .at-saber-list li:last-child { border-bottom: none; }
      .at-saber-list .text { flex: 1; color: #4b5563; }
      .at-saber-list .num {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        min-width: 14px;
        text-align: right;
        color: #6b7280;
      }
      .at-saber-list .num.alta  { color: #b91c1c; }
      .at-saber-list .num.media { color: #92400e; }
      .at-detail-link {
        display: inline-block;
        margin-top: 10px;
        font-size: 12px;
        font-weight: 600;
        color: #2563eb;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
      }
      .at-detail-link:hover { text-decoration: underline; }

      /* ── Filtros: nivel y materia ───────────────────────── */
      .at-nivel-chip,
      .at-mat-chip {
        padding: 5px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid #e5e7eb;
        background: #fff;
        color: #4b5563;
        transition: background .12s, border-color .12s;
      }
      .at-nivel-chip:hover,
      .at-mat-chip:hover { background: #f9fafb; }
      .at-nivel-chip.active {
        background: #f3f4f6;
        color: #1f2937;
        border-color: #d1d5db;
        font-weight: 600;
      }
      .at-nivel-chip.active.alta  { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
      .at-nivel-chip.active.media { background:#fefce8; color:#92400e; border-color:#fde68a; }
      .at-mat-chip.active {
        background: var(--primary);
        color: #fff;
        border-color: var(--primary);
        font-weight: 600;
      }

      /* ── Modal de detalle ──────────────────────────────── */
      .det-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 20px;
        letter-spacing: .4px;
        text-transform: uppercase;
      }
      .det-badge.alta  { background:#fef2f2; color:#b91c1c; }
      .det-badge.media { background:#fef3c7; color:#92400e; }
      .det-tipo-block {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 10px;
        background: #fff;
      }
      .det-tipo-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        background: #f9fafb;
        border-bottom: none;
        font-size: 12px;
        font-weight: 600;
        color: #1f2937;
        cursor: pointer;
        user-select: none;
        transition: background .15s;
      }
      .det-tipo-header:hover { background: #f3f4f6; }
      .det-tipo-block.open .det-tipo-header { border-bottom: 1px solid #e5e7eb; }
      .det-tipo-chevron {
        font-size: 10px;
        color: #9ca3af;
        transition: transform .2s;
        flex-shrink: 0;
      }
      .det-tipo-block.open .det-tipo-chevron { transform: rotate(90deg); }
      .det-tipo-body { display: none; }
      .det-tipo-block.open .det-tipo-body { display: block; }
      .det-tipo-count {
        font-size: 11px;
        font-weight: 500;
        color: #6b7280;
      }
      .det-eje-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-bottom: 1px solid #f3f4f6;
      }
      .det-eje-row:last-child { border-bottom: none; }
      .det-eje-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .det-eje-dot.alta  { background: #dc2626; }
      .det-eje-dot.media { background: #d97706; }
      .det-eje-name {
        flex: 1;
        font-size: 13px;
        color: #374151;
      }
      .det-bar-wrap {
        width: 72px;
        height: 5px;
        background: #f3f4f6;
        border-radius: 3px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .det-bar-fill { height: 100%; border-radius: 3px; }
      .det-bar-fill.alta  { background: #dc2626; }
      .det-bar-fill.media { background: #d97706; }
      .det-score {
        font-size: 13px;
        font-weight: 600;
        width: 28px;
        text-align: right;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
        color: #374151;
      }

      /* ── Acordeón por materia ──────────────────────────────── */
      .det-mat-block {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .det-mat-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 14px;
        background: #f9fafb;
        cursor: pointer;
        width: 100%;
        border: none;
        text-align: left;
        transition: background .15s;
        border-bottom: 1px solid transparent;
      }
      .det-mat-header:hover { background: #f3f4f6; }
      .det-mat-block.open .det-mat-header {
        border-bottom-color: #e5e7eb;
        background: #f3f4f6;
      }
      .det-mat-chevron {
        font-size: 11px;
        color: #9ca3af;
        transition: transform .2s;
        flex-shrink: 0;
        line-height: 1;
      }
      .det-mat-block.open .det-mat-chevron { transform: rotate(90deg); }
      .det-mat-nombre {
        font-weight: 700;
        font-size: 13px;
        color: #1f2937;
        flex: 1;
      }
      .det-mat-pills { display: flex; gap: 5px; flex-shrink: 0; }
      .det-mat-pill {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 20px;
      }
      .det-mat-pill.alta  { background: #fef2f2; color: #b91c1c; }
      .det-mat-pill.media { background: #fef3c7; color: #92400e; }
      .det-mat-body {
        display: none;
        padding: 10px;
        background: #fafbfc;
      }
      .det-mat-block.open .det-mat-body { display: block; }
      .det-mat-body .det-tipo-block { margin-bottom: 8px; }
      .det-mat-body .det-tipo-block:last-child { margin-bottom: 0; }
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
    finally { btnGenerar.disabled = false; btnGenerar.innerHTML = `${_ico('refresh',13)} Actualizar alertas` }
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

  // ── Resumen ───────────────────────────────────────────────────────────────
  function actualizarResumen() {
    const nAlta  = alertas.filter(a => a.nivelAlerta === 'ALTA').length
    const nMedia = alertas.filter(a => a.nivelAlerta === 'MEDIA').length
    const nEst   = new Set(alertas.map(a => a.estudianteId)).size
    const nEstA  = new Set(alertas.filter(a => a.nivelAlerta === 'ALTA').map(a => a.estudianteId)).size

    resumenEl.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:18px'
    resumenEl.innerHTML = [
      { val: nEst,   lbl: 'Estudiantes con alertas', cls: ''      },
      { val: nEstA,  lbl: 'En riesgo alto',          cls: 'alta'  },
      { val: nAlta,  lbl: 'Alertas altas',           cls: 'alta'  },
      { val: nMedia, lbl: 'Alertas medias',          cls: 'media' },
    ].map(({ val, lbl, cls }) => `
      <div class="at-stat">
        <span class="at-stat-bar ${cls}"></span>
        <div>
          <div class="at-stat-num">${val}</div>
          <div class="at-stat-lbl">${lbl}</div>
        </div>
      </div>`).join('')
  }

  // ── Tabs de filtro por materia ────────────────────────────────────────────
  function renderMateriaTabs() {
    if (!materiasList.length) { materiasTabsEl.style.display = 'none'; return }
    materiasTabsEl.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px'
    materiasTabsEl.innerHTML = [{ id: 0, nombre: 'Todas las materias' }, ...materiasList].map(m => {
      const sel = materiaFiltro === m.id
      return `<button class="at-mat-chip${sel ? ' active' : ''}" data-mid="${m.id}">${m.nombre}</button>`
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
      { val: '',      label: 'Todos',        cls: ''      },
      { val: 'ALTA',  label: 'Riesgo alto',  cls: 'alta'  },
      { val: 'MEDIA', label: 'Riesgo medio', cls: 'media' },
    ].map(({ val, label, cls }) => {
      const active = nivelFiltro === val
      return `<button class="at-nivel-chip${active ? ' active' : ''} ${cls}" data-nivel="${val}">${label}</button>`
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
              Presione <strong>Actualizar alertas</strong> para calcularlas desde las evaluaciones.
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
    const total     = est.alertas.length
    const cls       = tieneAlta ? 'alta' : 'media'

    // Agrupa por materia+tipo
    const porTipo = new Map()
    est.alertas.forEach(a => {
      const key = `${a.materiaNombre || ''}_${a.tipoSaberNombre}`
      const label = a.materiaNombre ? `${a.materiaNombre} · ${a.tipoSaberNombre}` : a.tipoSaberNombre
      if (!porTipo.has(key)) porTipo.set(key, { label, alta: 0, media: 0 })
      const g = porTipo.get(key)
      if (a.nivelAlerta === 'ALTA') g.alta++; else g.media++
    })

    const saberRows = [...porTipo.values()].map(g => {
      const nums = [
        g.alta  ? `<span class="num alta">${g.alta}</span>`  : '',
        g.media ? `<span class="num media">${g.media}</span>` : '',
      ].filter(Boolean).join('')
      return `<li><span class="text">${g.label}</span>${nums}</li>`
    }).join('')

    return `
      <div class="at-card ${cls}">
        <div class="at-card-head">
          <span class="at-sev ${cls}">${tieneAlta ? 'Riesgo alto' : 'Riesgo medio'}</span>
          <span class="at-card-meta">${total} alerta${total !== 1 ? 's' : ''}</span>
        </div>
        <div class="at-card-name">${est.nombre}</div>
        <ul class="at-saber-list">${saberRows}</ul>
        <button class="at-detail-link" data-det-est="${est.id}">Ver detalle →</button>
      </div>`
  }

  // ── Modal de detalle ──────────────────────────────────────────────────────
  function openModal(est) {
    detEstRef = est
    const tieneAlta = est.alertas.some(a => a.nivelAlerta === 'ALTA')
    const nAlta     = est.alertas.filter(a => a.nivelAlerta === 'ALTA').length
    const nMedia    = est.alertas.filter(a => a.nivelAlerta === 'MEDIA').length

    detNombre.textContent = est.nombre
    detBadge.className = `det-badge ${tieneAlta ? 'alta' : 'media'}`
    detBadge.textContent = tieneAlta ? 'Riesgo alto' : 'Riesgo medio'
    detMeta.textContent = [
      nAlta  ? `${nAlta} alta${nAlta!==1?'s':''}`   : '',
      nMedia ? `${nMedia} media${nMedia!==1?'s':''}` : '',
    ].filter(Boolean).join(' · ')

    // Agrupar materia → tipo de saber → ejes
    const porMateria = new Map()
    est.alertas.forEach(a => {
      const matKey = a.materiaNombre || 'Sin materia'
      if (!porMateria.has(matKey)) porMateria.set(matKey, { nombre: matKey, alta: 0, media: 0, tipos: new Map() })
      const mat = porMateria.get(matKey)
      if (a.nivelAlerta === 'ALTA') mat.alta++; else mat.media++
      if (!mat.tipos.has(a.tipoSaberNombre)) mat.tipos.set(a.tipoSaberNombre, [])
      mat.tipos.get(a.tipoSaberNombre).push(a)
    })

    const materias = [...porMateria.values()]

    detBody.innerHTML = materias.map((mat, idx) => {
      const pills = [
        mat.alta  ? `<span class="det-mat-pill alta">${mat.alta} alta${mat.alta!==1?'s':''}</span>`   : '',
        mat.media ? `<span class="det-mat-pill media">${mat.media} media${mat.media!==1?'s':''}</span>` : '',
      ].filter(Boolean).join('')

      const tiposHtml = [...mat.tipos.entries()].map(([tipoNombre, alertas]) => {
        const rows = alertas
          .sort((x, y) => (x.nivelAlerta === 'ALTA' ? 0 : 1) - (y.nivelAlerta === 'ALTA' ? 0 : 1))
          .map(a => {
            const cls = a.nivelAlerta === 'ALTA' ? 'alta' : 'media'
            const pct = Math.round(Number(a.promedio) / 5 * 100)
            return `
              <div class="det-eje-row">
                <span class="det-eje-dot ${cls}"></span>
                <span class="det-eje-name">${a.ejeNombre}</span>
                <div class="det-bar-wrap"><div class="det-bar-fill ${cls}" style="width:${pct}%"></div></div>
                <span class="det-score">${Number(a.promedio).toFixed(1)}</span>
              </div>`
          }).join('')
        return `
          <div class="det-tipo-block">
            <div class="det-tipo-header">
              <span class="det-tipo-chevron">▸</span>
              <span style="flex:1">${tipoNombre}</span>
              <span class="det-tipo-count">${alertas.length} alerta${alertas.length!==1?'s':''}</span>
            </div>
            <div class="det-tipo-body">${rows}</div>
          </div>`
      }).join('')

      return `
        <div class="det-mat-block">
          <button class="det-mat-header" type="button">
            <span class="det-mat-chevron">▸</span>
            <span class="det-mat-nombre">${mat.nombre}</span>
            <span class="det-mat-pills">${pills}</span>
          </button>
          <div class="det-mat-body">${tiposHtml}</div>
        </div>`
    }).join('')

    detBody.querySelectorAll('.det-mat-header').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.det-mat-block').classList.toggle('open'))
    })
    detBody.querySelectorAll('.det-tipo-header').forEach(hdr => {
      hdr.addEventListener('click', () => hdr.closest('.det-tipo-block').classList.toggle('open'))
    })

    overlay.style.display = 'flex'
  }
}
