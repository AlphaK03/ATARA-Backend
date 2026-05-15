import {
  getAniosLectivos, createAnioLectivo, activarAnioLectivo,
  updateAnioLectivo, deleteAnioLectivo,
  getPeriodos, activarPeriodo, createPeriodo, updatePeriodo, deletePeriodo,
  getAccessToken,
} from '../api.js'
import { showConfirm, openModal, backendMsg } from '../confirm.js'

export async function renderAniosLectivos(container) {
  container.innerHTML = `
    <h1>Años Lectivos</h1>
    <p class="page-desc">
      Gestión de años lectivos y periodos. Solo un año puede estar activo a la vez.
    </p>

    <!-- Crear año lectivo -->
    <div class="card">
      <h2 class="collapsible-trigger open" id="form-toggle">Registrar nuevo año lectivo</h2>
      <div id="form-body">
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;
                    padding:10px 14px;margin-bottom:16px;font-size:13px;color:#0369a1;
                    display:flex;align-items:flex-start;gap:8px">
          <span style="display:inline-flex;width:16px;height:16px;flex-shrink:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>
          <span>
            Al crear el año lectivo el sistema genera automáticamente los
            <strong>3 trimestres</strong>.
            El I Trimestre queda activo por defecto.
            Puedes editar, eliminar o agregar periodos después de crearlo.
          </span>
        </div>
        <div id="form-msg"></div>
        <form id="anio-form">
          <div class="form-grid" style="max-width:260px">
            <div class="form-group">
              <label>Año</label>
              <input type="number" name="anio" placeholder="2026" min="2000" max="2100" required />
            </div>
          </div>
          <div class="btn-row">
            <button type="submit" class="btn btn-primary">Crear año lectivo</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Listado -->
    <div class="card">
      <div class="section-actions">
        <h2 style="margin:0">Listado</h2>
        <button class="btn btn-secondary btn-sm" id="refresh-btn">Actualizar</button>
      </div>
      <div id="list-msg"></div>
      <div id="anios-list"></div>
    </div>

    <style>
      .anio-row { border:1px solid #e5e7eb;border-radius:10px;margin-bottom:14px;overflow:hidden }
      .anio-header {
        display:flex;align-items:center;gap:12px;padding:14px 18px;
        background:#f9fafb;cursor:pointer;user-select:none;
        justify-content:space-between;flex-wrap:wrap;
      }
      .anio-header:hover { background:#f1f5f9 }
      .anio-header .left  { display:flex;align-items:center;gap:10px;flex-wrap:wrap }
      .anio-header .right { display:flex;align-items:center;gap:6px;flex-wrap:wrap }
      .anio-body  { padding:0 18px 16px;display:none }
      .anio-body.open { display:block }
      .trimestre-list { display:flex;flex-direction:column;gap:6px;margin-top:10px }
      .trimestre-item {
        display:flex;align-items:center;justify-content:space-between;
        padding:9px 14px;border-radius:8px;background:#f8faff;
        border:1px solid #e0e7ff;font-size:13px;flex-wrap:wrap;gap:8px
      }
      .trimestre-item.activo { background:#f0fdf4;border-color:#bbf7d0 }
      .t-info { display:flex;align-items:center;gap:10px;flex-wrap:wrap }
      .t-actions { display:flex;align-items:center;gap:6px }
      .chevron { transition:transform .2s;font-size:12px;color:#9ca3af;flex-shrink:0 }
      .chevron.open { transform:rotate(90deg) }
      .btn-icon {
        padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;
        font-weight:500;border:1px solid transparent
      }
      .btn-edit   { background:#eff6ff;color:#2563eb;border-color:#bfdbfe }
      .btn-edit:hover { background:#dbeafe }
      .btn-del    { background:#fee2e2;color:#dc2626;border-color:#fca5a5 }
      .btn-del:hover  { background:#fecaca }
      .btn-add-periodo {
        margin-top:12px;display:inline-flex;align-items:center;gap:6px;
        padding:6px 14px;border-radius:7px;border:1px dashed #6366f1;
        background:#f5f3ff;color:#6366f1;font-size:12px;cursor:pointer;font-weight:500
      }
      .btn-add-periodo:hover { background:#ede9fe }
    </style>
  `

  const listDiv = container.querySelector('#anios-list')
  const formMsg = container.querySelector('#form-msg')
  const listMsg = container.querySelector('#list-msg')

  // Track which años are expanded so reloads preserve state
  const expanded = new Set()

  // Collapsible form
  container.querySelector('#form-toggle').addEventListener('click', e => {
    const body = container.querySelector('#form-body')
    const open = e.target.classList.toggle('open')
    body.style.display = open ? '' : 'none'
  })

  // ── Load & render ──────────────────────────────────────────────────────────
  async function loadList() {
    listDiv.innerHTML = '<p class="loading">Cargando...</p>'
    listMsg.innerHTML = ''
    try {
      const anios = await getAniosLectivos()
      if (!anios.length) {
        listDiv.innerHTML = '<p class="empty">No hay años lectivos registrados.</p>'
        return
      }

      const periodosMap = {}
      await Promise.all(anios.map(async a => {
        try { periodosMap[a.id] = await getPeriodos(a.id) } catch { periodosMap[a.id] = [] }
      }))

      // Auto-expand active year on first load
      const anioActivo = anios.find(a => a.activo)
      if (anioActivo && expanded.size === 0) expanded.add(anioActivo.id)

      listDiv.innerHTML = anios.map(a => {
        const periodos = periodosMap[a.id] || []
        const isOpen   = expanded.has(a.id)

        const activoBadge = a.activo
          ? '<span class="badge badge-green">Activo</span>'
          : '<span class="badge badge-gray">Inactivo</span>'

        const activarAnioBtn = !a.activo
          ? `<button class="btn btn-sm btn-success activar-anio-btn" data-id="${a.id}">Activar año</button>`
          : ''

        const trimestreItems = periodos.map(p => `
          <div class="trimestre-item${p.activo ? ' activo' : ''}">
            <div class="t-info">
              <strong>${p.nombre}</strong>
              ${p.activo
                ? '<span style="font-size:11px;color:#16a34a;font-weight:600">● Activo</span>'
                : `<button class="btn btn-sm activar-periodo-btn"
                    data-id="${p.id}"
                    style="font-size:11px;padding:3px 10px;background:#3b82f6;color:#fff;
                           border:none;border-radius:5px;cursor:pointer">
                    Activar
                   </button>`}
            </div>
            <div class="t-actions">
              <button class="btn-icon btn-edit edit-periodo-btn"
                data-id="${p.id}" data-nombre="${p.nombre}"
                data-anio-id="${a.id}">
                Editar
              </button>
              <button class="btn-icon btn-del del-periodo-btn"
                data-id="${p.id}" data-nombre="${p.nombre}" data-anio-id="${a.id}">
                Eliminar
              </button>
            </div>
          </div>
        `).join('')

        return `
          <div class="anio-row">
            <div class="anio-header" data-anio-id="${a.id}">
              <div class="left">
                <strong style="font-size:16px">${a.anio}</strong>
                ${activoBadge}
                <span style="font-size:12px;color:#9ca3af">${periodos.length} periodo${periodos.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="right">
                ${activarAnioBtn}
                <button class="btn-icon btn-edit edit-anio-btn"
                  data-id="${a.id}" data-anio="${a.anio}">
                  Editar
                </button>
                <button class="btn-icon btn-del del-anio-btn"
                  data-id="${a.id}" data-anio="${a.anio}"
                  data-n-periodos="${periodos.length}">
                  Eliminar
                </button>
                <span class="chevron${isOpen ? ' open' : ''}">▶</span>
              </div>
            </div>
            <div class="anio-body${isOpen ? ' open' : ''}" data-body="${a.id}">
              ${periodos.length
                ? `<p style="font-size:12px;color:#6b7280;margin:12px 0 4px">
                    Haz clic en <strong>Activar</strong> para cambiar el periodo en curso.
                    Puedes editar el nombre o eliminar un periodo que no necesites.
                   </p>
                   <div class="trimestre-list">${trimestreItems}</div>`
                : `<p style="font-size:13px;color:#9ca3af;margin:12px 0 6px">Sin periodos generados.</p>`
              }
              <button class="btn-add-periodo add-periodo-btn" data-anio-id="${a.id}" data-anio="${a.anio}">
                + Agregar periodo
              </button>
            </div>
          </div>`
      }).join('')

      wireEvents()

    } catch (err) {
      listDiv.innerHTML = `<p class="empty">${err.message}</p>`
    }
  }

  // ── Wire all dynamic event listeners ─────────────────────────────────────
  function wireEvents() {
    // Expand / collapse
    listDiv.querySelectorAll('.anio-header').forEach(header => {
      header.addEventListener('click', e => {
        if (e.target.closest('button')) return
        const anioId = Number(header.dataset.anioId)
        const body   = listDiv.querySelector(`[data-body="${anioId}"]`)
        const chev   = header.querySelector('.chevron')
        const open   = body.classList.toggle('open')
        chev.classList.toggle('open', open)
        open ? expanded.add(anioId) : expanded.delete(anioId)
      })
    })

    // Activar año
    listDiv.querySelectorAll('.activar-anio-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true
        try {
          await activarAnioLectivo(btn.dataset.id)
          listMsg.innerHTML = '<div class="alert alert-success">Año lectivo activado.</div>'
          await loadList()
        } catch (err) {
          listMsg.innerHTML = `<div class="alert alert-error">${err.message}</div>`
          btn.disabled = false
        }
      })
    })

    // Activar periodo
    listDiv.querySelectorAll('.activar-periodo-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true
        try {
          await activarPeriodo(btn.dataset.id)
          listMsg.innerHTML = '<div class="alert alert-success">Periodo activado.</div>'
          await loadList()
        } catch (err) {
          listMsg.innerHTML = `<div class="alert alert-error">${err.message}</div>`
          btn.disabled = false
        }
      })
    })

    // ── Editar año lectivo ─────────────────────────────────────────────────
    listDiv.querySelectorAll('.edit-anio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, anio } = btn.dataset
        const modal = openModal({
          title: `Editar año lectivo ${anio}`,
          body: `
            <div class="form-group">
              <label>Año *</label>
              <input id="m-anio" type="number" value="${anio}" min="2000" max="2100" required />
            </div>
          `,
        })
        modal.saveBtn.addEventListener('click', async () => {
          modal.saveBtn.disabled = true
          modal.msgEl.innerHTML  = ''
          try {
            await updateAnioLectivo(id, {
              anio: Number(modal.bodyEl.querySelector('#m-anio').value),
            })
            if (!getAccessToken()) { modal.close(); return }
            modal.close()
            listMsg.innerHTML = '<div class="alert alert-success">Año lectivo actualizado.</div>'
            await loadList()
          } catch (err) {
            modal.msgEl.innerHTML =
              `<div class="alert alert-error">${backendMsg(err)}</div>`
            modal.saveBtn.disabled = false
          }
        })
      })
    })

    // ── Eliminar año lectivo ───────────────────────────────────────────────
    listDiv.querySelectorAll('.del-anio-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const { id, anio, nPeriodos } = btn.dataset
        const ok = await showConfirm({
          title: `¿Eliminar el año lectivo ${anio}?`,
          message: `
            <p>Esta acción es <strong>permanente</strong>.</p>
            <p style="margin-top:8px">Se eliminarán también:</p>
            <ul style="margin:6px 0 0 20px;list-style:disc">
              <li><strong>${nPeriodos} periodo${nPeriodos !== '1' ? 's' : ''}</strong> asociados</li>
              <li>Todas las <strong>secciones</strong> del año</li>
              <li>Matrículas, evaluaciones y alertas de ese año</li>
            </ul>
          `,
          confirmText: 'Sí, eliminar año',
        })
        if (!ok) return
        btn.disabled = true
        try {
          await deleteAnioLectivo(id)
          if (!getAccessToken()) return
          listMsg.innerHTML = `<div class="alert alert-success">Año lectivo ${anio} eliminado.</div>`
          expanded.delete(Number(id))
          await loadList()
        } catch (err) {
          listMsg.innerHTML =
            `<div class="alert alert-error"><strong>No se pudo eliminar.</strong> ${backendMsg(err)}</div>`
          btn.disabled = false
        }
      })
    })

    // ── Editar periodo ─────────────────────────────────────────────────────
    listDiv.querySelectorAll('.edit-periodo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, nombre, anioId } = btn.dataset
        const modal = openModal({
          title: `Editar periodo: ${nombre}`,
          body: `
            <div class="form-group">
              <label>Nombre del periodo *</label>
              <input id="m-nombre" value="${nombre}"
                placeholder="Ej: I Trimestre, I Semestre, Período Único…" required />
            </div>
          `,
        })
        modal.saveBtn.addEventListener('click', async () => {
          const nuevoNombre = modal.bodyEl.querySelector('#m-nombre').value.trim()
          if (!nuevoNombre) {
            modal.msgEl.innerHTML = '<div class="alert alert-error">El nombre es obligatorio.</div>'
            return
          }
          modal.saveBtn.disabled = true
          modal.msgEl.innerHTML  = ''
          try {
            await updatePeriodo(id, {
              nombre: nuevoNombre,
              anioLectivoId: Number(anioId),
            })
            if (!getAccessToken()) { modal.close(); return }
            modal.close()
            listMsg.innerHTML = '<div class="alert alert-success">Periodo actualizado.</div>'
            await loadList()
          } catch (err) {
            modal.msgEl.innerHTML =
              `<div class="alert alert-error">${backendMsg(err)}</div>`
            modal.saveBtn.disabled = false
          }
        })
      })
    })

    // ── Eliminar periodo ───────────────────────────────────────────────────
    listDiv.querySelectorAll('.del-periodo-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const { id, nombre } = btn.dataset
        const ok = await showConfirm({
          title: `¿Eliminar el periodo "${nombre}"?`,
          message: `
            <p>Esta acción eliminará permanentemente el periodo.</p>
            <p style="margin-top:8px;color:#d97706">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="display:inline;vertical-align:-2px;margin-right:3px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Todas las <strong>evaluaciones</strong> y <strong>alertas</strong>
              registradas en este periodo también se eliminarán.
            </p>
            <p style="margin-top:8px;font-size:12px;color:#6b7280">
              Si solo quieres desactivarlo, activa otro periodo en su lugar.
            </p>
          `,
          confirmText: 'Sí, eliminar periodo',
        })
        if (!ok) return
        btn.disabled = true
        try {
          await deletePeriodo(id)
          if (!getAccessToken()) return
          listMsg.innerHTML = `<div class="alert alert-success">Periodo "${nombre}" eliminado.</div>`
          await loadList()
        } catch (err) {
          listMsg.innerHTML =
            `<div class="alert alert-error"><strong>No se pudo eliminar.</strong> ${backendMsg(err)}</div>`
          btn.disabled = false
        }
      })
    })

    // ── Agregar periodo ────────────────────────────────────────────────────
    listDiv.querySelectorAll('.add-periodo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { anioId, anio } = btn.dataset
        const modal = openModal({
          title: `Agregar periodo — Año ${anio}`,
          body: `
            <p style="font-size:13px;color:#6b7280;margin:0 0 16px">
              Puedes añadir periodos personalizados (trimestres, semestres, etc.)
              para ajustar la estructura del año lectivo.
            </p>
            <div class="form-group">
              <label>Nombre del periodo *</label>
              <input id="m-nombre"
                placeholder="Ej: II Semestre, Período Único…" required />
            </div>
          `,
          saveText: 'Agregar',
        })
        modal.saveBtn.addEventListener('click', async () => {
          const nombre = modal.bodyEl.querySelector('#m-nombre').value.trim()
          if (!nombre) {
            modal.msgEl.innerHTML =
              '<div class="alert alert-error">El nombre del periodo es obligatorio.</div>'
            return
          }
          modal.saveBtn.disabled = true
          modal.msgEl.innerHTML  = ''
          try {
            await createPeriodo({ nombre, anioLectivoId: Number(anioId) })
            if (!getAccessToken()) { modal.close(); return }
            modal.close()
            expanded.add(Number(anioId))
            listMsg.innerHTML = `<div class="alert alert-success">Periodo "${nombre}" agregado.</div>`
            await loadList()
          } catch (err) {
            modal.msgEl.innerHTML =
              `<div class="alert alert-error">${backendMsg(err)}</div>`
            modal.saveBtn.disabled = false
          }
        })
      })
    })
  }

  // ── Create año lectivo ────────────────────────────────────────────────────
  container.querySelector('#refresh-btn').addEventListener('click', loadList)

  container.querySelector('#anio-form').addEventListener('submit', async e => {
    e.preventDefault()
    formMsg.innerHTML = ''
    const fd  = new FormData(e.target)
    const btn = e.target.querySelector('button[type=submit]')
    btn.disabled = true
    try {
      const created = await createAnioLectivo({
        anio: Number(fd.get('anio')),
      })
      formMsg.innerHTML =
        '<div class="alert alert-success">Año lectivo creado con los 3 trimestres generados automáticamente.</div>'
      e.target.reset()
      if (created?.id) expanded.add(created.id)
      await loadList()
    } catch (err) {
      formMsg.innerHTML = `<div class="alert alert-error">${err.message}</div>`
    } finally {
      btn.disabled = false
    }
  })

  await loadList()
}
