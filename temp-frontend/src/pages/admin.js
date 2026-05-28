import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getMaterias, getUserId, toggleEstadoUsuario } from '../api.js'

const ROL_BADGE  = { ADMIN: 'badge-blue', DOCENTE: 'badge-green', COORDINADOR: 'badge-yellow' }
const ESTADO_BADGE = { ACTIVO: 'badge-green', INACTIVO: 'badge-red' }
const ROL_LABEL  = { ADMIN: 'Administrador', DOCENTE: 'Docente', COORDINADOR: 'Coordinador' }

// Sembrado en V2__sample_data.sql. Cuenta intocable por seguridad: nadie puede
// eliminarla y su rol/estado nunca cambian (validado también en backend).
const SUPERADMIN_ID = 1

let _usuarios = []
let _materias = []

export async function renderAdmin(container) {
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;flex-wrap:wrap;gap:10px">
      <div>
        <h1 style="margin-bottom:4px">Gestión de usuarios</h1>
        <p class="page-desc" style="margin-bottom:0">Administra los usuarios del sistema ATARA.</p>
      </div>
      <button id="btn-nuevo" class="btn btn-primary">+ Nuevo usuario</button>
    </div>

    <!-- Formulario de creación / edición (oculto por defecto) -->
    <div id="form-panel" style="display:none;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:24px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 id="form-title" style="margin:0;font-size:16px;color:#0369a1">Nuevo usuario</h2>
        <button id="btn-form-close" style="border:none;background:none;cursor:pointer;font-size:22px;color:#64748b;line-height:1;padding:0 4px" title="Cerrar">×</button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Nombre <span style="color:#dc2626">*</span></label>
          <input type="text" id="f-nombre" maxlength="100" placeholder="Nombre(s)">
        </div>
        <div class="form-group">
          <label>Apellidos <span style="color:#dc2626">*</span></label>
          <input type="text" id="f-apellidos" maxlength="150" placeholder="Apellidos">
        </div>
        <div class="form-group">
          <label>Correo electrónico <span style="color:#dc2626">*</span></label>
          <input type="email" id="f-correo" maxlength="150" placeholder="correo@institución.cr">
        </div>
        <div class="form-group" id="grupo-password">
          <label>Nueva contraseña <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
          <input type="password" id="f-password" maxlength="100" placeholder="Dejar vacío para no cambiar">
          <span style="font-size:11px;color:var(--text-muted)">Mínimo 8 caracteres. Dejar vacío para no cambiar.</span>
        </div>
        <div class="form-group">
          <label>Rol <span style="color:#dc2626">*</span></label>
          <select id="f-rol">
            <option value="">— Seleccione —</option>
            <option value="DOCENTE">Docente</option>
            <option value="COORDINADOR">Coordinador</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <div class="form-group" id="grupo-estado" style="display:none">
          <label>Estado</label>
          <select id="f-estado">
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>

      <!-- Selector de materias: solo visible cuando rol = DOCENTE -->
      <div id="grupo-materias" style="display:none;margin-top:16px;padding:14px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <label style="font-weight:600;font-size:13px;color:#334155;margin:0">
            Materias asignadas <span style="color:#dc2626">*</span>
            <span style="font-weight:400;color:var(--text-muted);margin-left:4px">
              (el docente solo podrá evaluar las marcadas)
            </span>
          </label>
          <div style="display:flex;gap:6px">
            <button type="button" id="btn-mat-all" class="btn btn-sm btn-secondary" style="font-size:11px;padding:3px 10px">Marcar todas</button>
            <button type="button" id="btn-mat-none" class="btn btn-sm btn-secondary" style="font-size:11px;padding:3px 10px">Desmarcar</button>
          </div>
        </div>
        <div id="materias-checkboxes" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px">
          <span style="color:var(--text-muted);font-size:13px">Cargando materias…</span>
        </div>
        <div id="materias-count" style="margin-top:8px;font-size:11px;color:var(--text-muted)"></div>
      </div>

      <div id="form-error" style="margin-top:14px;font-size:13px;color:#dc2626"></div>
      <div class="btn-row" style="margin-top:20px">
        <button id="btn-save" class="btn btn-primary">Guardar</button>
        <button id="btn-cancel" class="btn btn-secondary">Cancelar</button>
      </div>
    </div>

    <!-- Tabla de usuarios -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <span id="lbl-count" style="font-size:13px;color:var(--text-muted)">Cargando…</span>
        <input id="admin-search" type="text" placeholder="Buscar por nombre o correo…"
               style="min-width:220px;padding:7px 10px;border-radius:6px;border:1px solid var(--border);font-size:13px">
      </div>
      <div id="admin-msg"></div>
      <div class="table-wrap">
        <table id="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th style="text-align:center;width:200px">Acciones</th>
            </tr>
          </thead>
          <tbody id="admin-tbody">
            <tr><td colspan="6" class="loading">Cargando usuarios…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  // ── referencias ────────────────────────────────────────────────────────────
  const msg        = container.querySelector('#admin-msg')
  const tbody      = container.querySelector('#admin-tbody')
  const lblCount   = container.querySelector('#lbl-count')
  const searchInput = container.querySelector('#admin-search')
  const formPanel  = container.querySelector('#form-panel')
  const formTitle  = container.querySelector('#form-title')
  const formError  = container.querySelector('#form-error')
  const btnNuevo   = container.querySelector('#btn-nuevo')
  const btnSave    = container.querySelector('#btn-save')
  const btnCancel  = container.querySelector('#btn-cancel')
  const btnClose   = container.querySelector('#btn-form-close')
  const grupoEstado = container.querySelector('#grupo-estado')
  const grupoPwd    = container.querySelector('#grupo-password')
  const grupoMat    = container.querySelector('#grupo-materias')
  const matBox     = container.querySelector('#materias-checkboxes')
  const matCount   = container.querySelector('#materias-count')
  const fRol       = container.querySelector('#f-rol')

  let editingId = null  // null = crear, número = editar
  const currentUserId = Number(getUserId())  // del JWT, para reglas de auto-protección

  // ── cargar usuarios ────────────────────────────────────────────────────────
  async function cargarUsuarios() {
    try {
      _usuarios = await getUsuarios() ?? []
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-error" style="margin:16px">${e.message}</div>`
      return
    }
    renderTable(_usuarios)
  }

  // ── cargar catálogo de materias (una sola vez por sesión de página) ───────
  async function cargarMaterias() {
    try {
      _materias = await getMaterias() ?? []
    } catch (e) {
      console.warn('No se pudieron cargar las materias:', e.message)
      _materias = []
    }
  }

  // ── pintar checkboxes de materias y opcionalmente marcar un subconjunto ──
  // Sin materiaIdsMarcadas → todas marcadas (default para usuario nuevo).
  function pintarMaterias(materiaIdsMarcadas) {
    if (!_materias.length) {
      matBox.innerHTML = `<span style="color:#dc2626;font-size:13px">
        No hay materias en el catálogo. Crea materias antes de asignar docentes.
      </span>`
      return
    }
    const marcadas = materiaIdsMarcadas ?? _materias.map(m => m.id)
    const setMarcadas = new Set(marcadas)
    matBox.innerHTML = _materias.map(m => `
      <label style="display:flex;align-items:center;gap:6px;padding:6px 10px;
                    border:1px solid #e2e8f0;border-radius:6px;background:#fff;
                    cursor:pointer;font-size:13px;user-select:none">
        <input type="checkbox" class="mat-cb" value="${m.id}"
          ${setMarcadas.has(m.id) ? 'checked' : ''}
          style="accent-color:var(--primary);cursor:pointer">
        <span>${escHtml(m.nombre)}</span>
      </label>
    `).join('')
    matBox.querySelectorAll('.mat-cb').forEach(cb => {
      cb.addEventListener('change', actualizarContadorMaterias)
    })
    actualizarContadorMaterias()
  }

  function actualizarContadorMaterias() {
    const sel = matBox.querySelectorAll('.mat-cb:checked').length
    const tot = _materias.length
    matCount.textContent = `${sel} de ${tot} materia${tot !== 1 ? 's' : ''} seleccionada${sel !== 1 ? 's' : ''}`
    matCount.style.color = sel === 0 ? '#dc2626' : 'var(--text-muted)'
  }

  function getMateriasSeleccionadas() {
    return [...matBox.querySelectorAll('.mat-cb:checked')].map(cb => Number(cb.value))
  }

  function toggleGrupoMaterias() {
    grupoMat.style.display = fRol.value === 'DOCENTE' ? '' : 'none'
  }

  function renderTable(lista) {
    lblCount.textContent = `${lista.length} usuario${lista.length !== 1 ? 's' : ''}`
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">Sin resultados.</td></tr>`
      return
    }
    tbody.innerHTML = lista.map((u, i) => {
      const esSuper    = u.id === SUPERADMIN_ID
      const esYoMismo  = u.id === currentUserId
      const esActivo   = u.estado === 'ACTIVO'
      const puedeEditar   = !esSuper || esYoMismo
      const puedeEliminar = !esSuper && !esYoMismo
      const puedeToggle   = !esSuper && !esYoMismo
      const tagSuper = esSuper
        ? '<span class="badge badge-blue" style="margin-left:6px;font-size:10px" title="Cuenta protegida del sistema">★ Principal</span>'
        : ''
      const tagYo = esYoMismo
        ? '<span class="badge badge-gray" style="margin-left:6px;font-size:10px">Tú</span>'
        : ''
      return `
      <tr>
        <td style="color:var(--text-muted);width:36px">${i + 1}</td>
        <td>
          <div style="font-weight:600">${escHtml(u.nombre)} ${escHtml(u.apellidos)}${tagSuper}${tagYo}</div>
        </td>
        <td style="color:var(--text-muted)">${escHtml(u.correo)}</td>
        <td><span class="badge ${ROL_BADGE[u.rol] ?? 'badge-gray'}">${ROL_LABEL[u.rol] ?? u.rol}</span></td>
        <td><span class="badge ${ESTADO_BADGE[u.estado] ?? 'badge-gray'}">${esActivo ? 'Activo' : 'Inactivo'}</span></td>
        <td style="text-align:center;white-space:nowrap">
          ${puedeEditar
            ? `<button class="btn btn-sm btn-secondary btn-edit" data-id="${u.id}" title="Editar">Editar</button>`
            : `<button class="btn btn-sm btn-secondary" disabled title="Cuenta protegida — solo el administrador principal puede editarse a sí mismo">Editar</button>`}
          ${puedeToggle
            ? `<button class="btn btn-sm btn-secondary btn-toggle" data-id="${u.id}"
                 style="margin-left:4px${esActivo ? ';color:#b45309' : ';color:#16a34a'}"
                 title="${esActivo ? 'Desactivar usuario' : 'Activar usuario'}"
                 >${esActivo ? 'Desactivar' : 'Activar'}</button>`
            : ''}
          ${puedeEliminar
            ? `<button class="btn btn-sm btn-danger btn-del" data-id="${u.id}" title="Eliminar usuario" style="margin-left:4px">×</button>`
            : `<button class="btn btn-sm btn-danger" disabled title="${esSuper ? 'El administrador principal no se puede eliminar' : 'No puedes eliminar tu propia cuenta'}" style="margin-left:4px">×</button>`}
        </td>
      </tr>
    `}).join('')

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => abrirEditar(Number(btn.dataset.id)))
    })
    tbody.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleEstado(Number(btn.dataset.id)))
    })
    tbody.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', () => confirmarEliminar(Number(btn.dataset.id)))
    })
  }

  // ── búsqueda en vivo ───────────────────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase()
    renderTable(q
      ? _usuarios.filter(u =>
          `${u.nombre} ${u.apellidos}`.toLowerCase().includes(q) ||
          u.correo.toLowerCase().includes(q))
      : _usuarios)
  })

  // ── abrir form nuevo ───────────────────────────────────────────────────────
  function abrirNuevo() {
    editingId = null
    formTitle.textContent = 'Nuevo usuario'
    limpiarForm()
    grupoEstado.style.display = 'none'
    grupoPwd.style.display = 'none'
    // Reset por si el último abrirEditar deshabilitó rol/estado (superadmin/self)
    const fRolEl = container.querySelector('#f-rol')
    const fEstadoEl = container.querySelector('#f-estado')
    fRolEl.disabled = false; fRolEl.title = ''
    fEstadoEl.disabled = false; fEstadoEl.title = ''
    // Sin marcar específicamente nada → pintarMaterias() las marca todas
    pintarMaterias(null)
    toggleGrupoMaterias()
    formPanel.style.display = ''
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    container.querySelector('#f-nombre').focus()
  }

  // ── abrir form editar ──────────────────────────────────────────────────────
  function abrirEditar(id) {
    const u = _usuarios.find(x => x.id === id)
    if (!u) return
    editingId = id
    formTitle.textContent = `Editar — ${u.nombre} ${u.apellidos}`
    container.querySelector('#f-nombre').value    = u.nombre
    container.querySelector('#f-apellidos').value = u.apellidos
    container.querySelector('#f-correo').value    = u.correo
    container.querySelector('#f-password').value  = ''
    container.querySelector('#f-password').placeholder = 'Dejar vacío para no cambiar'
    container.querySelector('#f-rol').value       = u.rol
    container.querySelector('#f-estado').value    = u.estado
    grupoEstado.style.display = ''
    grupoPwd.style.display = ''
    formError.textContent = ''

    // Reglas de auto-protección: rol y estado nunca cambian en
    //   - el superadmin (cuenta de instalación, intocable)
    //   - el propio usuario logueado (anti lock-out)
    // Backend valida lo mismo (AdminServiceImpl). Aquí solo deshabilitamos
    // los inputs y dejamos un aviso para que el admin sepa por qué.
    const esSuper   = id === SUPERADMIN_ID
    const esYoMismo = id === currentUserId
    const bloquear  = esSuper || esYoMismo
    const fRolEl    = container.querySelector('#f-rol')
    const fEstadoEl = container.querySelector('#f-estado')
    fRolEl.disabled    = bloquear
    fEstadoEl.disabled = bloquear
    fRolEl.title    = bloquear
      ? (esSuper ? 'El rol del administrador principal no se puede cambiar.'
                 : 'No puedes cambiar tu propio rol.')
      : ''
    fEstadoEl.title = bloquear
      ? (esSuper ? 'El estado del administrador principal no se puede cambiar.'
                 : 'No puedes cambiar tu propio estado.')
      : ''

    // Pre-marcar solo las materias que ya tiene
    pintarMaterias(Array.isArray(u.materiaIds) ? u.materiaIds : [])
    toggleGrupoMaterias()
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
    ;['#f-nombre','#f-apellidos','#f-correo','#f-password','#f-rol','#f-estado'].forEach(sel => {
      const el = container.querySelector(sel)
      if (el) el.value = ''
    })
    formError.textContent = ''
    grupoMat.style.display = 'none'
    matBox.innerHTML = ''
    matCount.textContent = ''
  }

  // ── guardar (crear o actualizar) ───────────────────────────────────────────
  async function guardar() {
    formError.textContent = ''
    const nombre    = container.querySelector('#f-nombre').value.trim()
    const apellidos = container.querySelector('#f-apellidos').value.trim()
    const correo    = container.querySelector('#f-correo').value.trim()
    const password  = container.querySelector('#f-password').value
    const rol       = container.querySelector('#f-rol').value
    const estado    = container.querySelector('#f-estado').value

    if (!nombre || !apellidos || !correo || !rol) {
      formError.textContent = 'Completa todos los campos requeridos.'
      return
    }
    if (editingId && password && password.length < 8) {
      formError.textContent = 'La contraseña debe tener al menos 8 caracteres.'
      return
    }

    // Validación específica para DOCENTE: debe tener al menos una materia.
    // Sin materia el wizard de evaluación no carga preguntas (el backend filtra
    // por usuario_materias en getContextoUsuario).
    let materiaIds = null
    if (rol === 'DOCENTE') {
      materiaIds = getMateriasSeleccionadas()
      if (!materiaIds.length) {
        formError.textContent = 'Selecciona al menos una materia para el docente.'
        return
      }
    }

    const payload = { nombre, apellidos, correo, rol }
    if (password) payload.password = password
    if (editingId && estado) payload.estado = estado
    if (materiaIds !== null) payload.materiaIds = materiaIds

    btnSave.disabled = true
    btnSave.textContent = 'Guardando…'

    try {
      if (editingId) {
        const updated = await updateUsuario(editingId, payload)
        const idx = _usuarios.findIndex(u => u.id === editingId)
        if (idx !== -1) _usuarios[idx] = updated
      } else {
        const created = await createUsuario(payload)
        _usuarios.push(created)
      }
      cerrarForm()
      const q = searchInput.value.toLowerCase()
      renderTable(q
        ? _usuarios.filter(u =>
            `${u.nombre} ${u.apellidos}`.toLowerCase().includes(q) ||
            u.correo.toLowerCase().includes(q))
        : _usuarios)
      mostrarExito(editingId
        ? 'Usuario actualizado correctamente.'
        : 'Usuario creado. Se envió un correo con las credenciales al nuevo usuario.')
    } catch (e) {
      formError.textContent = e.message
    } finally {
      btnSave.disabled = false
      btnSave.textContent = 'Guardar'
    }
  }

  // ── eliminar con confirmación ──────────────────────────────────────────────
  async function confirmarEliminar(id) {
    const u = _usuarios.find(x => x.id === id)
    if (!u) return
    if (!confirm(`¿Eliminar al usuario "${u.nombre} ${u.apellidos}"?\nEsta acción no se puede deshacer.`)) return

    try {
      await deleteUsuario(id)
      _usuarios = _usuarios.filter(x => x.id !== id)
      const q = searchInput.value.toLowerCase()
      renderTable(q
        ? _usuarios.filter(u2 =>
            `${u2.nombre} ${u2.apellidos}`.toLowerCase().includes(q) ||
            u2.correo.toLowerCase().includes(q))
        : _usuarios)
      mostrarExito('Usuario eliminado.')
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-error" style="margin:16px">${e.message}</div>`
      setTimeout(() => { msg.innerHTML = '' }, 4000)
    }
  }

  // ── activar / desactivar usuario ──────────────────────────────────────────
  async function toggleEstado(id) {
    const u = _usuarios.find(x => x.id === id)
    if (!u) return
    const accion = u.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'
    if (!confirm(`¿${accion} al usuario "${u.nombre} ${u.apellidos}"?`)) return

    try {
      const updated = await toggleEstadoUsuario(id)
      const idx = _usuarios.findIndex(x => x.id === id)
      if (idx !== -1) _usuarios[idx] = updated
      const q = searchInput.value.toLowerCase()
      renderTable(q
        ? _usuarios.filter(u2 =>
            `${u2.nombre} ${u2.apellidos}`.toLowerCase().includes(q) ||
            u2.correo.toLowerCase().includes(q))
        : _usuarios)
      mostrarExito(`Usuario ${updated.estado === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente.`)
    } catch (e) {
      msg.innerHTML = `<div class="alert alert-error" style="margin:16px">${e.message}</div>`
      setTimeout(() => { msg.innerHTML = '' }, 4000)
    }
  }

  function mostrarExito(texto) {
    msg.innerHTML = `<div class="alert alert-success" style="margin:16px">${texto}</div>`
    setTimeout(() => { msg.innerHTML = '' }, 3500)
  }

  // ── eventos ────────────────────────────────────────────────────────────────
  btnNuevo.addEventListener('click', abrirNuevo)
  btnSave.addEventListener('click', guardar)
  btnCancel.addEventListener('click', cerrarForm)
  btnClose.addEventListener('click', cerrarForm)

  container.querySelector('#f-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') guardar()
  })

  // Mostrar/ocultar selector de materias según el rol elegido
  fRol.addEventListener('change', () => {
    if (fRol.value === 'DOCENTE' && !matBox.querySelector('.mat-cb')) {
      // Primera vez que se elige DOCENTE en este formulario: pintar todas marcadas
      pintarMaterias(null)
    }
    toggleGrupoMaterias()
  })

  // Atajos de marcar todas / desmarcar
  container.querySelector('#btn-mat-all').addEventListener('click', () => {
    matBox.querySelectorAll('.mat-cb').forEach(cb => { cb.checked = true })
    actualizarContadorMaterias()
  })
  container.querySelector('#btn-mat-none').addEventListener('click', () => {
    matBox.querySelectorAll('.mat-cb').forEach(cb => { cb.checked = false })
    actualizarContadorMaterias()
  })

  await Promise.all([cargarUsuarios(), cargarMaterias()])
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
