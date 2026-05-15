import {
  getAniosLectivos, getAnioLectivoActivo,
  getSecciones, createSeccion, updateSeccion, deleteSeccion,
  getNiveles, getCentros, getDocentes, getAccessToken,
  getContextoUsuario, getEstudiantes,
} from '../api.js'
import { showConfirm, openModal, backendMsg } from '../confirm.js'
import { showToast } from '../utils/toast.js'

export async function renderSecciones(container) {
  container.innerHTML = `
    <h1>Secciones</h1>
    <p class="page-desc">
      Gestión de secciones por año lectivo. Puedes crear, editar y eliminar secciones.
    </p>

    <!-- Selector de año lectivo -->
    <div class="card" style="padding:14px 18px;margin-bottom:0">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <label style="font-size:13px;font-weight:600;color:#374151">Año lectivo:</label>
        <select id="sel-anio" style="min-width:140px">
          <option value="">Cargando…</option>
        </select>
        <button class="btn btn-primary btn-sm" id="btn-nueva-seccion" style="display:none">+ Nueva sección</button>
      </div>
    </div>

    <!-- Listado -->
    <div class="card">
      <div id="list-msg"></div>
      <div id="secciones-body">
        <p class="loading">Selecciona un año lectivo para ver las secciones.</p>
      </div>
    </div>

    <style>
      .sec-table td { vertical-align:middle }
      .btn-edit-sec {
        padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;
        background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe
      }
      .btn-edit-sec:hover { background:#dbeafe }
      .btn-del-sec  {
        padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;
        background:#fee2e2;color:#dc2626;border:1px solid #fca5a5
      }
      .btn-del-sec:hover  { background:#fecaca }
    </style>
  `

  const selAnio   = container.querySelector('#sel-anio')
  const listMsg   = container.querySelector('#list-msg')
  const secBody   = container.querySelector('#secciones-body')

  // Catálogos compartidos por todos los formularios
  let catalogos = { niveles: [], centros: [], docentes: [], estudiantes: [] }
  let anioActivo = null
  let esAdmin = false
  let esDocente = false
  let userCtx = null

  try {
    const [anios, niveles, centros, docentes, activo, ctx, estudiantes] = await Promise.all([
      getAniosLectivos(),
      getNiveles(),
      getCentros(),
      getDocentes(),
      getAnioLectivoActivo().catch(() => null),
      getContextoUsuario().catch(() => null),
      getEstudiantes('ACTIVO').catch(() => []),
    ])
    userCtx   = ctx
    esAdmin   = ctx?.rol === 'ADMIN'
    esDocente = ctx?.rol === 'DOCENTE'
    // Botón "Nueva sección" visible para ADMIN y DOCENTE
    if (esAdmin || esDocente) container.querySelector('#btn-nueva-seccion').style.display = ''
    catalogos = { niveles, centros, docentes, estudiantes: estudiantes ?? [] }
    anioActivo = activo

    selAnio.innerHTML = anios.map(a =>
      `<option value="${a.id}">${a.anio}${a.activo ? ' (activo)' : ''}</option>`
    ).join('')

    // Pre-select active year
    if (activo) selAnio.value = activo.id

    await loadSecciones()
  } catch (err) {
    secBody.innerHTML = `<p class="empty">Error al cargar catálogos: ${err.message}</p>`
    return
  }

  selAnio.addEventListener('change', loadSecciones)

  // ── Load secciones for selected year ──────────────────────────────────────
  async function loadSecciones() {
    const anioId = Number(selAnio.value)
    if (!anioId) return
    listMsg.innerHTML = ''
    secBody.innerHTML = '<p class="loading">Cargando secciones…</p>'
    try {
      const secciones = await getSecciones(anioId)
      if (!secciones.length) {
        secBody.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
            <div style="width:36px;height:36px;margin:0 auto 12px;opacity:.4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18"/><path d="M9 21V9"/></svg></div>
            <p>No hay secciones para este año lectivo.</p>
          </div>`
        return
      }

      // Group by centro
      const byCentro = {}
      for (const s of secciones) {
        const c = s.centroNombre || 'Sin centro'
        if (!byCentro[c]) byCentro[c] = []
        byCentro[c].push(s)
      }

      secBody.innerHTML = Object.entries(byCentro).map(([centro, lista]) => `
        <div style="margin-bottom:20px">
          <h3 style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;
                     letter-spacing:.05em;margin:0 0 10px;padding-bottom:6px;
                     border-bottom:1px solid #e5e7eb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" style="display:inline;vertical-align:-2px;margin-right:5px"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>${centro}
          </h3>
          <div class="table-wrap">
            <table class="sec-table responsive-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Grado</th><th>Docente</th>
                  <th>Estudiantes</th><th>Capacidad</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${lista.map(s => {
                  const vacia = s.totalEstudiantes === 0
                  const rowStyle = vacia
                    ? 'background:#fff5f5;border-left:3px solid #fca5a5'
                    : ''
                  return `
                  <tr style="${rowStyle}">
                    <td data-label="Nombre"><strong>${s.nombre}</strong>${vacia ? ' <span style="font-size:11px;color:#dc2626;font-weight:600">VACÍA</span>' : ''}</td>
                    <td data-label="Grado">${s.nivelGrado ? s.nivelGrado + '°' : '—'}</td>
                    <td data-label="Docente">${s.docenteNombreCompleto || '<span style="color:#9ca3af">Sin asignar</span>'}</td>
                    <td data-label="Estudiantes" style="${vacia ? 'color:#dc2626;font-weight:600' : ''}">${s.totalEstudiantes}</td>
                    <td data-label="Capacidad">${s.capacidad ?? '—'}</td>
                    <td class="td-actions">
                      ${esAdmin ? `<button class="btn-edit-sec" data-sec='${JSON.stringify(s)}'>Editar</button>` : ''}
                      ${esAdmin ? `<button class="btn-del-sec"
                        data-id="${s.id}" data-nombre="${s.nombre}">Eliminar</button>` : ''}
                    </td>
                  </tr>`
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')

      wireSeccionEvents()
    } catch (err) {
      secBody.innerHTML = `<p class="empty">Error: ${err.message}</p>`
    }
  }

  // ── Wire edit/delete for each sección ─────────────────────────────────────
  function wireSeccionEvents() {
    secBody.querySelectorAll('.btn-edit-sec').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = JSON.parse(btn.dataset.sec)
        abrirEditModal(s)
      })
    })

    secBody.querySelectorAll('.btn-del-sec').forEach(btn => {
      btn.addEventListener('click', async () => {
        const { id, nombre } = btn.dataset
        const ok = await showConfirm({
          title: `¿Eliminar la sección "${nombre}"?`,
          message: `
            <p>Esta acción es <strong>permanente</strong>.</p>
            <p style="margin-top:8px;color:#d97706">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="display:inline;vertical-align:-2px;margin-right:3px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Se eliminarán también todas las <strong>matrículas</strong>
              de los estudiantes en esta sección, así como evaluaciones y alertas asociadas.
            </p>
          `,
          confirmText: 'Sí, eliminar sección',
        })
        if (!ok) return
        btn.disabled = true
        try {
          await deleteSeccion(id)
          if (!getAccessToken()) return
          showToast(`Sección "${nombre}" eliminada.`, 'success')
          await loadSecciones()
        } catch (err) {
          showToast('No se pudo eliminar. ' + backendMsg(err), 'error')
          btn.disabled = false
        }
      })
    })
  }

  // ── Edit modal ─────────────────────────────────────────────────────────────
  function abrirEditModal(s) {
    const { niveles, centros, docentes } = catalogos

    // Try to match current values against catalogs for pre-selection
    const nivelMatch   = niveles.find(n => n.numeroGrado === s.nivelGrado)
    const centroMatch  = centros.find(c => c.nombre === s.centroNombre)
    const docenteMatch = docentes.find(d => d.nombreCompleto === s.docenteNombreCompleto)

    const modal = openModal({
      title: `Editar sección: ${s.nombre}`,
      body: seccionFormHtml({
        nombre:    s.nombre,
        nivelId:   nivelMatch?.id  ?? '',
        centroId:  centroMatch?.id ?? '',
        docenteId: docenteMatch?.id ?? '',
        capacidad: s.capacidad ?? '',
      }, catalogos),
    })

    modal.saveBtn.addEventListener('click', async () => {
      const nombre    = modal.bodyEl.querySelector('#sf-nombre').value.trim()
      const nivelId   = Number(modal.bodyEl.querySelector('#sf-nivel').value)
      const centroId  = Number(modal.bodyEl.querySelector('#sf-centro').value)
      const docenteId = modal.bodyEl.querySelector('#sf-docente').value
      const capacidad = modal.bodyEl.querySelector('#sf-capacidad').value

      if (!nombre || !nivelId || !centroId) {
        modal.msgEl.innerHTML =
          '<div class="alert alert-error">Nombre, nivel y centro son obligatorios.</div>'
        return
      }
      modal.saveBtn.disabled = true
      modal.msgEl.innerHTML  = ''

      const body = {
        nombre, nivelId, centroId,
        anioLectivoId: Number(selAnio.value),
        ...(docenteId ? { docenteId: Number(docenteId) } : {}),
        ...(capacidad  ? { capacidad: Number(capacidad) } : {}),
      }

      try {
        await updateSeccion(s.id, body)
        if (!getAccessToken()) { modal.close(); return }
        modal.close()
        showToast(`Sección "${nombre}" actualizada.`, 'success')
        await loadSecciones()
      } catch (err) {
        modal.msgEl.innerHTML =
          `<div class="alert alert-error">${backendMsg(err)}</div>`
        modal.saveBtn.disabled = false
      }
    })
  }

  // ── Nueva sección button (wizard con co-docentes y estudiantes) ───────────
  container.querySelector('#btn-nueva-seccion').addEventListener('click', () => {
    const anioId = Number(selAnio.value)
    if (!anioId) {
      listMsg.innerHTML = '<div class="alert alert-error">Selecciona un año lectivo primero.</div>'
      return
    }

    // Estado local del wizard
    const docentesAgregados = []    // ids de co-docentes seleccionados
    const estudiantesAgregados = [] // ids de estudiantes seleccionados

    const modal = openModal({
      title: 'Nueva sección',
      body: seccionWizardHtml(catalogos, { esDocente, esAdmin }),
      saveText: 'Crear sección',
    })

    const $ = sel => modal.bodyEl.querySelector(sel)

    function renderDocentesAgregados() {
      const ul = $('#sf-docentes-agregados')
      if (!docentesAgregados.length) {
        ul.innerHTML = '<li class="empty-chip">— Sin docentes adicionales —</li>'
        return
      }
      ul.innerHTML = docentesAgregados.map(id => {
        const d = catalogos.docentes.find(x => x.id === id)
        if (!d) return ''
        return `<li class="chip">${escHtml(d.nombreCompleto)}
          <button type="button" class="chip-x" data-id="${id}" title="Quitar">×</button>
        </li>`
      }).join('')
      ul.querySelectorAll('.chip-x').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.id)
          const idx = docentesAgregados.indexOf(id)
          if (idx !== -1) docentesAgregados.splice(idx, 1)
          renderDocentesAgregados()
          renderDocenteSugerencias()
        })
      })
    }

    function renderDocenteSugerencias() {
      const sel = $('#sf-docente-add')
      const opts = catalogos.docentes
        .filter(d => d.id !== userCtx?.userId)
        .filter(d => !docentesAgregados.includes(d.id))
      sel.innerHTML = `<option value="">— Seleccionar docente —</option>` +
        opts.map(d => `<option value="${d.id}">${escHtml(d.nombreCompleto)} (${escHtml(d.correo)})</option>`).join('')
    }

    function renderEstudiantesAgregados() {
      const ul = $('#sf-estudiantes-agregados')
      const cnt = $('#sf-estudiantes-count')
      cnt.textContent = String(estudiantesAgregados.length)
      if (!estudiantesAgregados.length) {
        ul.innerHTML = '<li class="empty-chip">— Sin estudiantes agregados —</li>'
        return
      }
      ul.innerHTML = estudiantesAgregados.map(id => {
        const e = catalogos.estudiantes.find(x => x.id === id)
        if (!e) return ''
        const nom = `${e.nombre || ''} ${e.apellidos || ''}`.trim()
        const ced = e.cedula ? ` <span class="muted">(${escHtml(e.cedula)})</span>` : ''
        return `<li class="chip">${escHtml(nom)}${ced}
          <button type="button" class="chip-x" data-id="${id}" title="Quitar">×</button>
        </li>`
      }).join('')
      ul.querySelectorAll('.chip-x').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.id)
          const idx = estudiantesAgregados.indexOf(id)
          if (idx !== -1) estudiantesAgregados.splice(idx, 1)
          renderEstudiantesAgregados()
          renderEstudianteResultados($('#sf-est-search').value)
        })
      })
    }

    function renderEstudianteResultados(query) {
      const ul = $('#sf-est-resultados')
      const q = (query || '').trim().toLowerCase()
      let pool = catalogos.estudiantes.filter(e => !estudiantesAgregados.includes(e.id))
      if (q) {
        pool = pool.filter(e =>
          (`${e.nombre || ''} ${e.apellidos || ''}`).toLowerCase().includes(q) ||
          (e.cedula || '').toLowerCase().includes(q)
        )
      }
      pool = pool.slice(0, 30)
      if (!pool.length) {
        ul.innerHTML = '<li class="empty-chip">' +
          (q ? 'Sin coincidencias.' : 'Comienza a escribir o haz clic en + para agregar.') + '</li>'
        return
      }
      ul.innerHTML = pool.map(e => {
        const nom = `${e.nombre || ''} ${e.apellidos || ''}`.trim()
        const ced = e.cedula ? ` <span class="muted">${escHtml(e.cedula)}</span>` : ''
        return `<li class="result-row">
          <span>${escHtml(nom)}${ced}</span>
          <button type="button" class="chip-add" data-id="${e.id}" title="Agregar">+</button>
        </li>`
      }).join('')
      ul.querySelectorAll('.chip-add').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.id)
          if (!estudiantesAgregados.includes(id)) estudiantesAgregados.push(id)
          renderEstudiantesAgregados()
          renderEstudianteResultados($('#sf-est-search').value)
        })
      })
    }

    // Wire eventos del wizard
    $('#sf-est-search').addEventListener('input', e => renderEstudianteResultados(e.target.value))
    $('#btn-add-docente').addEventListener('click', () => {
      const id = Number($('#sf-docente-add').value)
      if (!id) return
      if (!docentesAgregados.includes(id)) docentesAgregados.push(id)
      renderDocentesAgregados()
      renderDocenteSugerencias()
    })

    // Render inicial
    renderDocentesAgregados()
    renderDocenteSugerencias()
    renderEstudiantesAgregados()
    renderEstudianteResultados('')

    modal.saveBtn.addEventListener('click', async () => {
      const nombre    = $('#sf-nombre').value.trim()
      const nivelId   = Number($('#sf-nivel').value)
      const centroId  = Number($('#sf-centro').value)
      const capacidad = $('#sf-capacidad').value
      // El selector de titular solo existe para ADMIN
      const docenteSel = $('#sf-docente')
      const docenteId  = docenteSel ? docenteSel.value : ''

      if (!nombre || !nivelId || !centroId) {
        modal.msgEl.innerHTML =
          '<div class="alert alert-error">Nombre, nivel y centro son obligatorios.</div>'
        return
      }
      modal.saveBtn.disabled = true
      modal.msgEl.innerHTML  = ''
      try {
        await createSeccion({
          nombre, nivelId, centroId,
          anioLectivoId: anioId,
          ...(esAdmin && docenteId ? { docenteId: Number(docenteId) } : {}),
          ...(capacidad ? { capacidad: Number(capacidad) } : {}),
          ...(docentesAgregados.length    ? { docentesAdicionalesIds: docentesAgregados } : {}),
          ...(estudiantesAgregados.length ? { estudiantesIds: estudiantesAgregados } : {}),
        })
        if (!getAccessToken()) { modal.close(); return }
        modal.close()
        const detalle = estudiantesAgregados.length
          ? ` con ${estudiantesAgregados.length} estudiante${estudiantesAgregados.length !== 1 ? 's' : ''}`
          : ''
        showToast(`Sección "${nombre}" creada${detalle}.`, 'success')
        await loadSecciones()
      } catch (err) {
        modal.msgEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`
        modal.saveBtn.disabled = false
      }
    })
  })
}

// ── Wizard de "Nueva sección" con co-docentes y estudiantes ───────────────
function seccionWizardHtml({ niveles = [], centros = [], docentes = [] } = {}, { esDocente, esAdmin } = {}) {
  return `
    <style>
      .wizard-section { margin-top:18px;padding-top:14px;border-top:1px dashed #d1d5db }
      .wizard-section h4 { margin:0 0 10px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.04em }
      .chip-list { list-style:none;padding:0;margin:6px 0 0;display:flex;flex-wrap:wrap;gap:6px }
      .chip-list .chip {
        display:inline-flex;align-items:center;gap:6px;
        background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;
        padding:4px 8px;border-radius:14px;font-size:12px;font-weight:500;
      }
      .chip-list .chip .muted { color:#64748b;font-weight:400 }
      .chip-list .chip-x {
        background:none;border:none;color:#0369a1;cursor:pointer;
        font-size:14px;line-height:1;padding:0;font-weight:700
      }
      .chip-list .chip-x:hover { color:#dc2626 }
      .chip-list .empty-chip { color:#9ca3af;font-size:12px;font-style:italic;list-style:none }
      .result-list { list-style:none;padding:0;margin:6px 0 0;
        max-height:160px;overflow-y:auto;
        border:1px solid #e5e7eb;border-radius:6px;background:#fff }
      .result-list .result-row {
        display:flex;justify-content:space-between;align-items:center;
        padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:13px
      }
      .result-list .result-row:last-child { border-bottom:none }
      .result-list .result-row .muted { color:#64748b;font-size:11px;margin-left:4px }
      .result-list .chip-add {
        background:#22c55e;color:#fff;border:none;
        width:22px;height:22px;border-radius:50%;
        font-size:14px;font-weight:700;cursor:pointer;line-height:1
      }
      .result-list .chip-add:hover { background:#16a34a }
      .row-add { display:flex;gap:6px;align-items:center }
      .row-add select, .row-add input { flex:1 }
    </style>

    <div class="form-grid">
      <div class="form-group">
        <label>Nombre (letra/grupo) *</label>
        <input id="sf-nombre" placeholder="Ej: A, B, 7-1…" maxlength="10" required />
      </div>
      <div class="form-group">
        <label>Nivel / Grado *</label>
        <select id="sf-nivel">
          <option value="">— Seleccione —</option>
          ${niveles.map(n =>
            `<option value="${n.id}">${n.numeroGrado}° — ${escHtml(n.nombre)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Centro educativo *</label>
        <select id="sf-centro">
          <option value="">— Seleccione —</option>
          ${centros.map(c =>
            `<option value="${c.id}">${escHtml(c.nombre)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Capacidad <span style="color:#9ca3af">(opcional)</span></label>
        <input id="sf-capacidad" type="number" min="1" max="99" placeholder="Nº máx. estudiantes" />
      </div>
      ${esAdmin ? `
        <div class="form-group" style="grid-column: 1 / -1">
          <label>Docente titular <span style="color:#9ca3af">(opcional)</span></label>
          <select id="sf-docente">
            <option value="">— Sin asignar —</option>
            ${docentes.map(d =>
              `<option value="${d.id}">${escHtml(d.nombreCompleto)}</option>`
            ).join('')}
          </select>
        </div>` : `
        <div class="form-group" style="grid-column: 1 / -1">
          <div class="alert alert-info" style="margin:0;font-size:12.5px">
            Quedarás registrado automáticamente como <strong>docente titular</strong> de esta sección.
          </div>
        </div>`}
    </div>

    <!-- Bloque: Docentes adicionales (co-docentes) -->
    <div class="wizard-section">
      <h4>Docentes adicionales (co-docentes)</h4>
      <p style="font-size:12px;color:#6b7280;margin:0 0 8px">
        Otros docentes que también podrán acceder a esta sección. Opcional.
      </p>
      <div class="row-add">
        <select id="sf-docente-add"><option value="">— Seleccionar docente —</option></select>
        <button type="button" id="btn-add-docente" class="btn btn-sm btn-secondary">+ Agregar</button>
      </div>
      <ul id="sf-docentes-agregados" class="chip-list"></ul>
    </div>

    <!-- Bloque: Estudiantes -->
    <div class="wizard-section">
      <h4>Estudiantes a matricular (<span id="sf-estudiantes-count">0</span>)</h4>
      <p style="font-size:12px;color:#6b7280;margin:0 0 8px">
        Busca por nombre o cédula y haz clic en <strong>+</strong> para agregar uno a uno.
        Cada estudiante quedará matriculado en esta sección al guardar.
      </p>
      <input id="sf-est-search" type="text" placeholder="Buscar estudiante…"
             style="width:100%;padding:7px 10px;border-radius:6px;border:1px solid var(--border);font-size:13px" />
      <ul id="sf-est-resultados" class="result-list"></ul>
      <div style="margin-top:10px;font-size:12px;color:#374151;font-weight:600">Agregados:</div>
      <ul id="sf-estudiantes-agregados" class="chip-list"></ul>
    </div>
  `
}

// ── Sección form HTML (compartido para edición) ───────────────────────────
function seccionFormHtml(v = {}, { niveles = [], centros = [], docentes = [] } = {}) {
  return `
    <div class="form-grid">
      <div class="form-group">
        <label>Nombre (letra/grupo) *</label>
        <input id="sf-nombre" value="${v.nombre || ''}" placeholder="Ej: A, B, 7-1…"
               maxlength="10" required />
      </div>
      <div class="form-group">
        <label>Nivel / Grado *</label>
        <select id="sf-nivel">
          <option value="">— Seleccione —</option>
          ${niveles.map(n =>
            `<option value="${n.id}" ${v.nivelId === n.id ? 'selected' : ''}>${n.numeroGrado}° — ${escHtml(n.nombre)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Centro educativo *</label>
        <select id="sf-centro">
          <option value="">— Seleccione —</option>
          ${centros.map(c =>
            `<option value="${c.id}" ${v.centroId === c.id ? 'selected' : ''}>${escHtml(c.nombre)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Docente <span style="color:#9ca3af">(opcional)</span></label>
        <select id="sf-docente">
          <option value="">— Sin asignar —</option>
          ${docentes.map(d =>
            `<option value="${d.id}" ${v.docenteId === d.id ? 'selected' : ''}>${escHtml(d.nombreCompleto)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Capacidad <span style="color:#9ca3af">(opcional)</span></label>
        <input id="sf-capacidad" type="number" value="${v.capacidad || ''}" min="1" max="99"
               placeholder="Nº máx. estudiantes" />
      </div>
    </div>
  `
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
