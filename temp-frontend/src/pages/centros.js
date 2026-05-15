import {
  getCentrosAdmin,
  createCentroAdmin,
  updateCentroAdmin,
} from '../api.js'

let _centros = []

/**
 * Página de gestión de Centros Educativos.
 * Solo accesible para ADMIN. Permite listar, crear y editar.
 * NO se permite eliminar — los centros se conservan como histórico permanente
 * para preservar la integridad referencial de secciones y matrículas.
 */
export async function renderCentros(container) {
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;flex-wrap:wrap;gap:10px">
      <div>
        <h1 style="margin-bottom:4px">Centros educativos</h1>
        <p class="page-desc" style="margin-bottom:0">
          Administra los centros educativos del sistema. Por política, los centros no se pueden eliminar
          una vez creados — se conservan como histórico permanente.
        </p>
      </div>
      <button id="btn-nuevo" class="btn btn-primary">+ Nuevo centro</button>
    </div>

    <!-- Formulario crear/editar (oculto por defecto) -->
    <div id="form-panel" style="display:none;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:24px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 id="form-title" style="margin:0;font-size:16px;color:#0369a1">Nuevo centro educativo</h2>
        <button id="btn-form-close" style="border:none;background:none;cursor:pointer;font-size:22px;color:#64748b;line-height:1;padding:0 4px" title="Cerrar">×</button>
      </div>
      <div class="form-grid">
        <div class="form-group" style="grid-column: 1 / -1">
          <label>Nombre <span style="color:#dc2626">*</span></label>
          <input type="text" id="f-nombre" maxlength="200" placeholder="Ej: Liceo de San José">
        </div>
        <div class="form-group">
          <label>Circuito</label>
          <input type="text" id="f-circuito" maxlength="10" placeholder="Ej: 01">
        </div>
        <div class="form-group">
          <label>Dirección regional</label>
          <input type="text" id="f-regional" maxlength="100" placeholder="Ej: San José Norte">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" id="f-telefono" maxlength="20" placeholder="Ej: 22112233">
        </div>
        <div class="form-group">
          <label>Correo</label>
          <input type="email" id="f-correo" maxlength="150" placeholder="info@centro.cr">
        </div>
      </div>
      <div id="form-error" style="margin-top:14px;font-size:13px;color:#dc2626"></div>
      <div class="btn-row" style="margin-top:20px">
        <button id="btn-save" class="btn btn-primary">Guardar</button>
        <button id="btn-cancel" class="btn btn-secondary">Cancelar</button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <span id="lbl-count" style="font-size:13px;color:var(--text-muted)">Cargando…</span>
        <input id="centros-search" type="text" placeholder="Buscar por nombre, circuito o región…"
               style="min-width:240px;padding:7px 10px;border-radius:6px;border:1px solid var(--border);font-size:13px">
      </div>
      <div id="centros-msg"></div>
      <div class="table-wrap">
        <table id="centros-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Circuito</th>
              <th>Dirección regional</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th style="text-align:center;width:100px">Acciones</th>
            </tr>
          </thead>
          <tbody id="centros-tbody">
            <tr><td colspan="7" class="loading">Cargando centros…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  const msg         = container.querySelector('#centros-msg')
  const tbody       = container.querySelector('#centros-tbody')
  const lblCount    = container.querySelector('#lbl-count')
  const searchInput = container.querySelector('#centros-search')
  const formPanel   = container.querySelector('#form-panel')
  const formTitle   = container.querySelector('#form-title')
  const formError   = container.querySelector('#form-error')
  const btnNuevo    = container.querySelector('#btn-nuevo')
  const btnSave     = container.querySelector('#btn-save')
  const btnCancel   = container.querySelector('#btn-cancel')
  const btnClose    = container.querySelector('#btn-form-close')

  let editingId = null

  async function cargarCentros() {
    try {
      _centros = await getCentrosAdmin() ?? []
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-error" style="margin:16px">${e.message}</div>`
      return
    }
    renderTable(_centros)
  }

  function renderTable(lista) {
    lblCount.textContent = `${lista.length} centro${lista.length !== 1 ? 's' : ''}`
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin resultados.</td></tr>`
      return
    }
    tbody.innerHTML = lista.map((c, i) => `
      <tr>
        <td style="color:var(--text-muted);width:36px">${i + 1}</td>
        <td><div style="font-weight:600">${escHtml(c.nombre)}</div></td>
        <td>${escHtml(c.circuito) || '<span style="color:#9ca3af">—</span>'}</td>
        <td>${escHtml(c.direccionRegional) || '<span style="color:#9ca3af">—</span>'}</td>
        <td>${escHtml(c.telefono) || '<span style="color:#9ca3af">—</span>'}</td>
        <td style="color:var(--text-muted)">${escHtml(c.correo) || '<span style="color:#9ca3af">—</span>'}</td>
        <td style="text-align:center">
          <button class="btn btn-sm btn-secondary btn-edit" data-id="${c.id}" title="Editar">Editar</button>
        </td>
      </tr>
    `).join('')

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => abrirEditar(Number(btn.dataset.id)))
    })
  }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase()
    renderTable(q
      ? _centros.filter(c =>
          (c.nombre || '').toLowerCase().includes(q) ||
          (c.circuito || '').toLowerCase().includes(q) ||
          (c.direccionRegional || '').toLowerCase().includes(q))
      : _centros)
  })

  function abrirNuevo() {
    editingId = null
    formTitle.textContent = 'Nuevo centro educativo'
    limpiarForm()
    formPanel.style.display = ''
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    container.querySelector('#f-nombre').focus()
  }

  function abrirEditar(id) {
    const c = _centros.find(x => x.id === id)
    if (!c) return
    editingId = id
    formTitle.textContent = `Editar — ${c.nombre}`
    container.querySelector('#f-nombre').value    = c.nombre || ''
    container.querySelector('#f-circuito').value  = c.circuito || ''
    container.querySelector('#f-regional').value  = c.direccionRegional || ''
    container.querySelector('#f-telefono').value  = c.telefono || ''
    container.querySelector('#f-correo').value    = c.correo || ''
    formError.textContent = ''
    formPanel.style.display = ''
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    container.querySelector('#f-nombre').focus()
  }

  function cerrarForm() {
    formPanel.style.display = 'none'
    limpiarForm()
    editingId = null
  }

  function limpiarForm() {
    ;['#f-nombre','#f-circuito','#f-regional','#f-telefono','#f-correo'].forEach(sel => {
      const el = container.querySelector(sel)
      if (el) el.value = ''
    })
    formError.textContent = ''
  }

  async function guardar() {
    formError.textContent = ''
    const nombre              = container.querySelector('#f-nombre').value.trim()
    const circuito            = container.querySelector('#f-circuito').value.trim()
    const direccionRegional   = container.querySelector('#f-regional').value.trim()
    const telefono            = container.querySelector('#f-telefono').value.trim()
    const correo              = container.querySelector('#f-correo').value.trim()

    if (!nombre) {
      formError.textContent = 'El nombre del centro es obligatorio.'
      return
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      formError.textContent = 'El correo no tiene un formato válido.'
      return
    }

    const payload = {
      nombre,
      circuito:          circuito || null,
      direccionRegional: direccionRegional || null,
      telefono:          telefono || null,
      correo:            correo || null,
    }

    btnSave.disabled = true
    btnSave.textContent = 'Guardando…'
    try {
      if (editingId) {
        const updated = await updateCentroAdmin(editingId, payload)
        const idx = _centros.findIndex(c => c.id === editingId)
        if (idx !== -1) _centros[idx] = updated
      } else {
        const created = await createCentroAdmin(payload)
        _centros.push(created)
      }
      cerrarForm()
      const q = searchInput.value.toLowerCase()
      renderTable(q
        ? _centros.filter(c =>
            (c.nombre || '').toLowerCase().includes(q) ||
            (c.circuito || '').toLowerCase().includes(q) ||
            (c.direccionRegional || '').toLowerCase().includes(q))
        : _centros)
      mostrarExito(editingId ? 'Centro actualizado correctamente.' : 'Centro creado correctamente.')
    } catch (e) {
      formError.textContent = e.message
    } finally {
      btnSave.disabled = false
      btnSave.textContent = 'Guardar'
    }
  }

  function mostrarExito(texto) {
    msg.innerHTML = `<div class="alert alert-success" style="margin:16px">${texto}</div>`
    setTimeout(() => { msg.innerHTML = '' }, 3500)
  }

  btnNuevo.addEventListener('click', abrirNuevo)
  btnSave.addEventListener('click', guardar)
  btnCancel.addEventListener('click', cerrarForm)
  btnClose.addEventListener('click', cerrarForm)

  await cargarCentros()
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
