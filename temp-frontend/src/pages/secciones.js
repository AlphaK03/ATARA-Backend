import {
  getAniosLectivos, getAnioLectivoActivo,
  getSecciones, createSeccion, updateSeccion, deleteSeccion,
  getNiveles, getCentros, getDocentes, getAccessToken,
  getContextoUsuario,
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

  // Load catalogs in parallel; needed for create/edit forms
  let catalogos = { niveles: [], centros: [], docentes: [] }
  let anioActivo = null
  let esAdmin = false

  try {
    const [anios, niveles, centros, docentes, activo, ctx] = await Promise.all([
      getAniosLectivos(),
      getNiveles(),
      getCentros(),
      getDocentes(),
      getAnioLectivoActivo().catch(() => null),
      getContextoUsuario().catch(() => null),
    ])
    esAdmin = ctx?.rol === 'ADMIN'
    if (esAdmin) container.querySelector('#btn-nueva-seccion').style.display = ''
    catalogos = { niveles, centros, docentes }
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
            <div style="font-size:32px;margin-bottom:8px">🏫</div>
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
            🏫 ${centro}
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
              ⚠️ Se eliminarán también todas las <strong>matrículas</strong>
              de los estudiantes en esta sección, así como evaluaciones y alertas asociadas.
            </p>
          `,
          confirmText: 'Sí, eliminar sección',
        })
        if (!ok) return
        btn.disabled = true
        try {
          // NOTE: Backend DELETE /api/secciones/{id} not yet implemented.
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
        // NOTE: Backend PUT /api/secciones/{id} not yet implemented.
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

  // ── Nueva sección button ───────────────────────────────────────────────────
  container.querySelector('#btn-nueva-seccion').addEventListener('click', () => {
    const anioId = Number(selAnio.value)
    if (!anioId) {
      listMsg.innerHTML = '<div class="alert alert-error">Selecciona un año lectivo primero.</div>'
      return
    }
    const modal = openModal({
      title: 'Nueva sección',
      body: seccionFormHtml({}, catalogos),
      saveText: 'Crear sección',
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
      try {
        await createSeccion({
          nombre, nivelId, centroId,
          anioLectivoId: anioId,
          ...(docenteId ? { docenteId: Number(docenteId) } : {}),
          ...(capacidad  ? { capacidad: Number(capacidad) } : {}),
        })
        if (!getAccessToken()) { modal.close(); return }
        modal.close()
        showToast(`Sección "${nombre}" creada.`, 'success')
        await loadSecciones()
      } catch (err) {
        modal.msgEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`
        modal.saveBtn.disabled = false
      }
    })
  })
}

// ── Sección form HTML (shared for create and edit) ─────────────────────────
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
            `<option value="${n.id}" ${v.nivelId === n.id ? 'selected' : ''}>${n.numeroGrado}° — ${n.nombre}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Centro educativo *</label>
        <select id="sf-centro">
          <option value="">— Seleccione —</option>
          ${centros.map(c =>
            `<option value="${c.id}" ${v.centroId === c.id ? 'selected' : ''}>${c.nombre}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Docente <span style="color:#9ca3af">(opcional)</span></label>
        <select id="sf-docente">
          <option value="">— Sin asignar —</option>
          ${docentes.map(d =>
            `<option value="${d.id}" ${v.docenteId === d.id ? 'selected' : ''}>${d.nombreCompleto}</option>`
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
