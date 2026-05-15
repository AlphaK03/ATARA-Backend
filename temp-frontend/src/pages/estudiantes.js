import {
  getEstudiantes, getEstudiante,
  createEstudiante, updateEstudiante, deleteEstudiante,
  getAccessToken,
} from '../api.js'
import { showConfirm, backendMsg } from '../confirm.js'
import { showToast } from '../utils/toast.js'

const GENEROS        = ['MASCULINO', 'FEMENINO', 'OTRO']
const ESTADOS        = ['ACTIVO', 'INACTIVO', 'GRADUADO', 'TRASLADADO']
const FILTER_ESTADOS = ['', ...ESTADOS]

function estadoBadge(estado) {
  const map = { ACTIVO: 'badge-green', INACTIVO: 'badge-red', GRADUADO: 'badge-blue', TRASLADADO: 'badge-yellow' }
  return `<span class="badge ${map[estado] || 'badge-gray'}">${estado || '—'}</span>`
}

function studentFormHtml(s = {}, includeEstado = false) {
  return `
    <div class="form-grid">
      <div class="form-group">
        <label>Identificación *</label>
        <input name="identificacion" value="${s.identificacion || ''}" required />
      </div>
      <div class="form-group">
        <label>Nombre *</label>
        <input name="nombre" value="${s.nombre || ''}" required />
      </div>
      <div class="form-group">
        <label>Primer apellido *</label>
        <input name="apellido1" value="${s.apellido1 || ''}" required />
      </div>
      <div class="form-group">
        <label>Segundo apellido</label>
        <input name="apellido2" value="${s.apellido2 || ''}" />
      </div>
      <div class="form-group">
        <label>Fecha nacimiento</label>
        <input type="date" name="fechaNacimiento" value="${s.fechaNacimiento || ''}" />
      </div>
      <div class="form-group">
        <label>Género</label>
        <select name="genero">
          <option value="">— Sin especificar —</option>
          ${GENEROS.map(g => `<option value="${g}" ${s.genero === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>
      ${includeEstado ? `
      <div class="form-group">
        <label>Estado</label>
        <select name="estado">
          ${ESTADOS.map(e => `<option value="${e}" ${s.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="form-group">
        <label>Nombre acudiente</label>
        <input name="nombreAcudiente" value="${s.nombreAcudiente || ''}" />
      </div>
      <div class="form-group">
        <label>Teléfono acudiente</label>
        <input name="telefonoAcudiente" value="${s.telefonoAcudiente || ''}" />
      </div>
      <div class="form-group full">
        <label>Correo acudiente</label>
        <input type="email" name="correoAcudiente" value="${s.correoAcudiente || ''}" />
      </div>
    </div>
  `
}

export async function renderEstudiantes(container) {
  container.innerHTML = `
    <h1>Estudiantes</h1>
    <p class="page-desc">
      Gestión de estudiantes. Puedes crear, editar, cambiar estado y eliminar registros.
    </p>

    <div class="card">
      <h2 class="collapsible-trigger open" id="form-toggle">Registrar estudiante</h2>
      <div id="form-body">
        <div id="form-msg"></div>
        <form id="create-form">
          ${studentFormHtml()}
          <div class="btn-row">
            <button type="submit" class="btn btn-primary">Crear estudiante</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="section-actions">
        <h2 style="margin:0">Listado</h2>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="estado-filter">
            ${FILTER_ESTADOS.map(e => `<option value="${e}">${e || 'Todos los estados'}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" id="refresh-btn">Actualizar</button>
        </div>
      </div>
      <div id="list-msg"></div>
      <div class="table-wrap">
        <table class="responsive-table">
          <thead>
            <tr>
              <th>ID</th><th>Identificación</th><th>Nombre completo</th>
              <th>Acudiente</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- Edit modal -->
    <div id="edit-overlay" class="atara-overlay"
      style="display:none;z-index:100;">
      <div class="atara-box atara-modal-box inline-edit-box">
        <h2 style="margin-bottom:4px">Editar estudiante</h2>
        <p style="font-size:12px;color:#6b7280;margin:0 0 16px">
          El campo <strong>Estado</strong> permite cambiar la situación del estudiante sin eliminarlo.
        </p>
        <div id="edit-msg"></div>
        <form id="edit-form"></form>
        <div class="btn-row">
          <button class="btn btn-primary" id="edit-save">Guardar cambios</button>
          <button class="btn btn-secondary" id="edit-cancel">Cancelar</button>
        </div>
      </div>
    </div>

    <style>
      .btn-danger {
        background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;
        padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:500;
      }
      .btn-danger:hover { background:#fecaca }
    </style>
  `

  const tbody       = container.querySelector('#tbody')
  const formMsg     = container.querySelector('#form-msg')
  const listMsg     = container.querySelector('#list-msg')
  const editOverlay = container.querySelector('#edit-overlay')
  const editForm    = container.querySelector('#edit-form')
  const editMsg     = container.querySelector('#edit-msg')
  let editingId     = null

  container.querySelector('#form-toggle').addEventListener('click', e => {
    const open = e.target.classList.toggle('open')
    container.querySelector('#form-body').style.display = open ? '' : 'none'
  })

  async function loadList() {
    const estado = container.querySelector('#estado-filter').value
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Cargando...</td></tr>'
    listMsg.innerHTML = ''
    try {
      const data = await getEstudiantes(estado || null)
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Sin resultados.</td></tr>'
        return
      }
      tbody.innerHTML = data.map(s => {
        const nombre = `${s.nombre} ${s.apellido1} ${s.apellido2 || ''}`.trim()
        return `
          <tr>
            <td data-label="ID">${s.id}</td>
            <td data-label="Identificación">${s.identificacion}</td>
            <td data-label="Nombre">${nombre}</td>
            <td data-label="Acudiente">${s.nombreAcudiente || '—'}</td>
            <td data-label="Estado">${estadoBadge(s.estado)}</td>
            <td class="td-actions">
              <button class="btn btn-sm btn-secondary edit-btn" data-id="${s.id}">Editar</button>
              <button class="btn-danger delete-btn" data-id="${s.id}" data-nombre="${nombre}">Eliminar</button>
            </td>
          </tr>
        `
      }).join('')

      // Edit handlers
      tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const s = await getEstudiante(btn.dataset.id)
            editingId = s.id
            editForm.innerHTML = studentFormHtml(s, true)  // includeEstado = true
            editMsg.innerHTML  = ''
            editOverlay.style.display = 'flex'
          } catch (err) {
            listMsg.innerHTML = `<div class="alert alert-error">${err.message}</div>`
          }
        })
      })

      // Delete handlers
      tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const nombre = btn.dataset.nombre
          const ok = await showConfirm({
            title: `¿Eliminar a ${nombre}?`,
            message: `
              <p>Esta acción es <strong>permanente</strong> y no se puede deshacer.</p>
              <p style="margin-top:8px">Se eliminarán también todos los registros asociados:</p>
              <ul style="margin:6px 0 0 20px;list-style:disc;color:#374151">
                <li>Matrículas en secciones</li>
                <li>Evaluaciones y calificaciones</li>
                <li>Alertas temáticas generadas</li>
              </ul>
              <p style="margin-top:10px;color:#d97706">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="display:inline;vertical-align:-2px;margin-right:3px"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
                Considera cambiar el <strong>Estado</strong> a <em>INACTIVO</em>
                o <em>TRASLADADO</em> para conservar el historial.
              </p>
            `,
            confirmText: 'Sí, eliminar permanentemente',
          })
          if (!ok) return

          btn.disabled = true
          try {
            await deleteEstudiante(btn.dataset.id)
            if (!getAccessToken()) return  // sesión expirada → login mostrado automáticamente
            showToast('Estudiante eliminado correctamente.', 'success')
            await loadList()
          } catch (err) {
            showToast('No se pudo eliminar. ' + backendMsg(err), 'error')
            btn.disabled = false
          }
        })
      })

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">${err.message}</td></tr>`
    }
  }

  container.querySelector('#estado-filter').addEventListener('change', loadList)
  container.querySelector('#refresh-btn').addEventListener('click', loadList)

  // Create form
  container.querySelector('#create-form').addEventListener('submit', async e => {
    e.preventDefault()
    formMsg.innerHTML = ''
    const fd  = new FormData(e.target)
    const btn = e.target.querySelector('button[type=submit]')
    btn.disabled = true
    try {
      const body = Object.fromEntries([...fd.entries()].filter(([, v]) => v !== ''))
      await createEstudiante(body)
      showToast('Estudiante creado correctamente.', 'success')
      formMsg.innerHTML = ''
      e.target.reset()
      await loadList()
    } catch (err) {
      formMsg.innerHTML = `<div class="alert alert-error">${err.message}</div>`
    } finally {
      btn.disabled = false
    }
  })

  // Edit modal — save
  container.querySelector('#edit-save').addEventListener('click', async () => {
    editMsg.innerHTML = ''
    const saveBtn = container.querySelector('#edit-save')
    saveBtn.disabled = true
    const fd = new FormData(editForm)
    try {
      const body = Object.fromEntries([...fd.entries()].filter(([, v]) => v !== ''))
      const updated = await updateEstudiante(editingId, body)
      if (!getAccessToken()) return  // sesión expirada → login mostrado automáticamente
      editOverlay.style.display = 'none'
      showToast('Estudiante actualizado correctamente.', 'success')
      await loadList()
    } catch (err) {
      editMsg.innerHTML = `<div class="alert alert-error">${err.message}</div>`
    } finally {
      saveBtn.disabled = false
    }
  })

  container.querySelector('#edit-cancel').addEventListener('click', () => {
    editOverlay.style.display = 'none'
  })

  await loadList()
}
