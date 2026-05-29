import {
  getAniosLectivos, getAnioLectivoActivo,
  getSecciones, createSeccion, updateSeccion, deleteSeccion, deleteSeccionDocente,
  getNiveles, getCentros, getDocentes, getAccessToken,
  getContextoUsuario, getEstudiantesParaSeccion,
  getMatriculasBySeccion,
} from '../api.js'
import { showConfirm, openModal, backendMsg } from '../confirm.js'
import { showToast } from '../utils/toast.js'
import { makeSearchableSelect } from '../utils/searchableSelect.js'
import {
  WIZARD_CSS, escHtml, escAttr,
  studentCardHtml, seccionWizardHtml,
} from './secciones-wizard.js'

export async function renderSecciones(container) {
  container.innerHTML = `
    <h1>Secciones</h1>
    <p class="page-desc">
      Gestión de secciones por año lectivo. Puedes crear, editar y eliminar secciones.
    </p>

    <div class="card" style="padding:14px 18px;margin-bottom:0">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <label style="font-size:13px;font-weight:600;color:#374151">Año lectivo:</label>
        <select id="sel-anio" style="min-width:140px"><option value="">Cargando…</option></select>
        <button class="btn btn-primary btn-sm" id="btn-nueva-seccion" style="display:none">+ Nueva sección</button>
      </div>
    </div>

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
      ${WIZARD_CSS}
    </style>
  `

  const selAnio = container.querySelector('#sel-anio')
  const listMsg = container.querySelector('#list-msg')
  const secBody = container.querySelector('#secciones-body')

  let catalogos = { niveles: [], centros: [], docentes: [], estudiantes: [] }
  let esAdmin = false, esDocente = false, userCtx = null

  try {
    const [anios, niveles, centros, docentes, activo, ctx, estudiantes] = await Promise.all([
      getAniosLectivos(),
      getNiveles(),
      getCentros(),
      getDocentes(),
      getAnioLectivoActivo().catch(() => null),
      getContextoUsuario().catch(() => null),
      // Catálogo precargado (solo ACTIVOS). El wizard hará un refetch específico
      // por año/sección para aplicar exclusión inteligente (V12+).
      getEstudiantesParaSeccion().catch(() => []),
    ])
    userCtx = ctx
    esAdmin   = ctx?.rol === 'ADMIN'
    esDocente = ctx?.rol === 'DOCENTE'
    if (esAdmin || esDocente) container.querySelector('#btn-nueva-seccion').style.display = ''
    catalogos = { niveles, centros, docentes, estudiantes: estudiantes ?? [] }

    selAnio.innerHTML = anios.map(a =>
      `<option value="${a.id}">${a.anio}${a.activo ? ' (activo)' : ''}</option>`
    ).join('')
    if (activo) selAnio.value = activo.id

    await loadSecciones()
  } catch (err) {
    secBody.innerHTML = `<p class="empty">Error al cargar catálogos: ${err.message}</p>`
    return
  }

  selAnio.addEventListener('change', loadSecciones)

  async function loadSecciones() {
    const anioId = Number(selAnio.value)
    if (!anioId) return
    listMsg.innerHTML = ''
    secBody.innerHTML = '<p class="loading">Cargando secciones…</p>'
    try {
      const secciones = await getSecciones(anioId)
      if (!secciones.length) {
        secBody.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-muted)"><p>No hay secciones para este año lectivo.</p></div>`
        return
      }

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
                     border-bottom:1px solid #e5e7eb">${escHtml(centro)}</h3>
          <div class="table-wrap">
            <table class="sec-table responsive-table">
              <thead><tr>
                <th>Nombre</th><th>Grado</th><th>Docente</th>
                <th>Estudiantes</th><th>Capacidad</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                ${lista.map(s => seccionRowHtml(s, esAdmin, esDocente, userCtx)).join('')}
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

  function wireSeccionEvents() {
    secBody.querySelectorAll('.btn-edit-sec').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = JSON.parse(btn.dataset.sec)
        abrirWizard({ modo: 'editar', seccion: s })
      })
    })
    secBody.querySelectorAll('.btn-del-sec').forEach(btn => {
      btn.addEventListener('click', async () => {
        const { id, nombre, mode } = btn.dataset
        const esDocenteDel = mode === 'docente'
        const message = esDocenteDel
          ? `<p>Solo puedes eliminar la sección porque está <strong>vacía</strong>
             (sin matrículas ni evaluaciones).</p>
             <p style="margin-top:8px;color:#6b7280;font-size:13px">
             Si en el futuro la sección tiene datos, solo un administrador podrá eliminarla.</p>`
          : `<p>Esta acción es <strong>permanente</strong>.</p>
             <p style="margin-top:8px;color:#d97706">Se eliminarán también todas las
             <strong>matrículas</strong>, evaluaciones y alertas asociadas.</p>`
        const ok = await showConfirm({
          title: `¿Eliminar la sección "${nombre}"?`,
          message,
          confirmText: 'Sí, eliminar sección',
        })
        if (!ok) return
        btn.disabled = true
        try {
          if (esDocenteDel) await deleteSeccionDocente(id)
          else              await deleteSeccion(id)
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

  container.querySelector('#btn-nueva-seccion').addEventListener('click', () => {
    const anioId = Number(selAnio.value)
    if (!anioId) {
      listMsg.innerHTML = '<div class="alert alert-error">Selecciona un año lectivo primero.</div>'
      return
    }
    abrirWizard({ modo: 'crear' })
  })

  // ── Wizard único: crear o editar ─────────────────────────────────────────
  async function abrirWizard({ modo, seccion = null }) {
    const esEdicion = modo === 'editar'
    const titulo = esEdicion ? `Editar sección: ${seccion.nombre}` : 'Nueva sección'

    const docentesAgregados = []
    const estudiantesAgregados = []

    const valoresIniciales = esEdicion ? {
      nombre:    seccion.nombre || '',
      nivelId:   seccion.nivelId  ?? '',
      centroId:  seccion.centroId ?? '',
      docenteId: seccion.docenteId ?? '',
      capacidad: seccion.capacidad ?? '',
    } : {}

    // Refrescar listas vivas antes de abrir el wizard.
    // El endpoint /secciones/catalogos/estudiantes devuelve todos los estudiantes
    // activos: un estudiante puede pertenecer a varias secciones del mismo año
    // (una por docente/materia). En edición, los que ya están en esta sección se
    // pre-seleccionan a partir de sus matrículas (getMatriculasBySeccion abajo).
    const anioParaCatalogo = esEdicion ? seccion.anioLectivoId : Number(selAnio.value)
    try {
      const [estudiantesFrescos, docentesFrescos] = await Promise.all([
        getEstudiantesParaSeccion(anioParaCatalogo, esEdicion ? seccion.id : null).catch(() => null),
        getDocentes().catch(() => null),
      ])
      if (Array.isArray(estudiantesFrescos)) catalogos.estudiantes = estudiantesFrescos
      if (Array.isArray(docentesFrescos))    catalogos.docentes    = docentesFrescos
    } catch { /* si falla, seguimos con los catalogos en memoria */ }

    if (esEdicion) {
      try {
        const matriculas = await getMatriculasBySeccion(seccion.id)
        ;(matriculas || []).forEach(m => {
          if (m.estado === 'ACTIVO' && m.estudianteId) estudiantesAgregados.push(m.estudianteId)
        })
      } catch { /* arranca vacío en estudiantes si falla */ }
    }

    const modal = openModal({
      title: titulo,
      body: seccionWizardHtml(catalogos, valoresIniciales, { esDocente, esAdmin, esEdicion }),
      saveText: esEdicion ? 'Guardar cambios' : 'Crear sección',
    })
    const modalBox = modal.el.querySelector('.atara-modal-box')
    if (modalBox) modalBox.classList.add('wide-modal')

    const $ = sel => modal.bodyEl.querySelector(sel)

    // Centro educativo con búsqueda por nombre (la lista puede ser larga).
    makeSearchableSelect($('#sf-centro'), { placeholder: 'Buscar centro educativo…' })

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
          <button type="button" class="chip-x" data-id="${id}" title="Quitar">×</button></li>`
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
        .filter(d => esEdicion || d.id !== userCtx?.userId)
        .filter(d => !docentesAgregados.includes(d.id))
      sel.innerHTML = `<option value="">— Seleccionar docente —</option>` +
        opts.map(d => `<option value="${d.id}">${escHtml(d.nombreCompleto)} (${escHtml(d.correo)})</option>`).join('')
    }

    function renderPicker(query = '') {
      const colA = $('#sf-est-disponibles')
      const colB = $('#sf-est-seleccionados')
      const cntA = $('#sf-est-disp-count')
      const cntB = $('#sf-est-sel-count')
      const totalEl = $('#sf-est-total')
      const q = (query || '').trim().toLowerCase()
      const matchQuery = e => {
        if (!q) return true
        const fullName = `${e.nombre || ''} ${e.apellido1 || ''} ${e.apellido2 || ''}`.toLowerCase()
        return fullName.includes(q) || (e.identificacion || '').toLowerCase().includes(q)
      }
      const totalSistema = catalogos.estudiantes.length
      const disponibles = catalogos.estudiantes
        .filter(e => !estudiantesAgregados.includes(e.id))
        .filter(matchQuery)
      const seleccionados = estudiantesAgregados
        .map(id => catalogos.estudiantes.find(e => e.id === id))
        .filter(Boolean)

      cntA.textContent = String(disponibles.length)
      cntB.textContent = String(seleccionados.length)
      if (totalEl) totalEl.textContent = `${totalSistema} estudiante${totalSistema !== 1 ? 's' : ''} en el sistema`

      let emptyMsg
      if (totalSistema === 0) {
        emptyMsg = `<li class="picker-empty" style="color:#dc2626">⚠ No se cargó ningún estudiante del servidor.<br><span style="font-size:11px;color:#94a3b8">Verifica que existan registros en la página "Estudiantes" o pulsa "↻ Recargar".</span></li>`
      } else if (q) {
        emptyMsg = `<li class="picker-empty">Sin coincidencias para "${escHtml(q)}".</li>`
      } else {
        emptyMsg = `<li class="picker-empty">Todos los estudiantes ya están seleccionados.</li>`
      }
      colA.innerHTML = disponibles.length
        ? disponibles.slice(0, 200).map(e => studentCardHtml(e, 'add')).join('')
        : emptyMsg
      colB.innerHTML = seleccionados.length
        ? seleccionados.map(e => studentCardHtml(e, 'remove')).join('')
        : `<li class="picker-empty">No has seleccionado estudiantes.</li>`

      colA.querySelectorAll('.student-card').forEach(card => {
        const id = Number(card.dataset.id)
        card.addEventListener('dblclick', () => agregar(id))
        card.querySelector('.student-action').addEventListener('click', e => {
          e.stopPropagation(); agregar(id)
        })
      })
      colB.querySelectorAll('.student-card').forEach(card => {
        const id = Number(card.dataset.id)
        card.addEventListener('dblclick', () => quitar(id))
        card.querySelector('.student-action').addEventListener('click', e => {
          e.stopPropagation(); quitar(id)
        })
      })
    }
    function agregar(id) {
      if (!estudiantesAgregados.includes(id)) estudiantesAgregados.push(id)
      renderPicker($('#sf-est-search').value)
    }
    function quitar(id) {
      const idx = estudiantesAgregados.indexOf(id)
      if (idx !== -1) estudiantesAgregados.splice(idx, 1)
      renderPicker($('#sf-est-search').value)
    }

    $('#sf-est-search').addEventListener('input', e => renderPicker(e.target.value))
    const btnReload = $('#sf-est-reload')
    if (btnReload) {
      btnReload.addEventListener('click', async () => {
        btnReload.disabled = true
        const original = btnReload.textContent
        btnReload.textContent = '…'
        try {
          const fresh = await getEstudiantesParaSeccion(anioParaCatalogo, esEdicion ? seccion.id : null)
          if (Array.isArray(fresh)) {
            catalogos.estudiantes = fresh
            renderPicker($('#sf-est-search').value)
            showToast(`Lista actualizada: ${fresh.length} estudiantes.`, 'success')
          }
        } catch (err) {
          showToast('No se pudo recargar: ' + err.message, 'error')
        } finally {
          btnReload.disabled = false
          btnReload.textContent = original
        }
      })
    }
    $('#btn-add-docente').addEventListener('click', () => {
      const id = Number($('#sf-docente-add').value)
      if (!id) return
      if (!docentesAgregados.includes(id)) docentesAgregados.push(id)
      renderDocentesAgregados()
      renderDocenteSugerencias()
    })

    renderDocentesAgregados()
    renderDocenteSugerencias()
    renderPicker()

    modal.saveBtn.addEventListener('click', async () => {
      const nombre    = $('#sf-nombre').value.trim()
      const nivelId   = Number($('#sf-nivel').value)
      const centroId  = Number($('#sf-centro').value)
      const capacidad = $('#sf-capacidad').value
      const docenteSel = $('#sf-docente')
      const docenteId  = docenteSel ? docenteSel.value : ''

      if (!nombre || !nivelId || !centroId) {
        modal.msgEl.innerHTML = '<div class="alert alert-error">Nombre, nivel y centro son obligatorios.</div>'
        return
      }
      modal.saveBtn.disabled = true
      modal.msgEl.innerHTML = ''

      const payload = {
        nombre, nivelId, centroId,
        anioLectivoId: esEdicion ? seccion.anioLectivoId : Number(selAnio.value),
        ...(esAdmin && docenteId ? { docenteId: Number(docenteId) } : {}),
        ...(capacidad ? { capacidad: Number(capacidad) } : {}),
        // En edición siempre enviamos las listas (aunque vacías) para que
        // el backend sincronice altas/bajas. En creación, solo si tienen contenido.
        ...(esEdicion
          ? { docentesAdicionalesIds: docentesAgregados, estudiantesIds: estudiantesAgregados }
          : {
              ...(docentesAgregados.length    ? { docentesAdicionalesIds: docentesAgregados } : {}),
              ...(estudiantesAgregados.length ? { estudiantesIds: estudiantesAgregados } : {}),
            }),
      }

      try {
        if (esEdicion) await updateSeccion(seccion.id, payload)
        else           await createSeccion(payload)
        if (!getAccessToken()) { modal.close(); return }
        modal.close()
        const verbo = esEdicion ? 'actualizada' : 'creada'
        const detalle = !esEdicion && estudiantesAgregados.length
          ? ` con ${estudiantesAgregados.length} estudiante${estudiantesAgregados.length !== 1 ? 's' : ''}`
          : ''
        showToast(`Sección "${nombre}" ${verbo}${detalle}.`, 'success')
        await loadSecciones()
      } catch (err) {
        modal.msgEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`
        modal.saveBtn.disabled = false
      }
    })
  }
}

function seccionRowHtml(s, esAdmin, esDocente, userCtx) {
  const vacia = s.totalEstudiantes === 0
  const rowStyle = vacia ? 'background:#fff5f5;border-left:3px solid #fca5a5' : ''
  // El DOCENTE puede editar si es el titular registrado.
  const esTitular = esDocente && s.docenteId === userCtx?.userId
  const puedeEditar = esAdmin || esTitular
  // El DOCENTE titular solo puede eliminar si la sección está vacía (regla del
  // backend: rechaza con 400 si hay matrículas/evaluaciones). El ADMIN siempre
  // puede eliminar (cascada total).
  let btnEliminar = ''
  if (esAdmin) {
    btnEliminar = `<button class="btn-del-sec" data-id="${s.id}" data-nombre="${escHtml(s.nombre)}" data-mode="admin">Eliminar</button>`
  } else if (esTitular && vacia) {
    btnEliminar = `<button class="btn-del-sec" data-id="${s.id}" data-nombre="${escHtml(s.nombre)}" data-mode="docente" title="Solo puedes eliminar tu sección vacía">Eliminar</button>`
  }
  return `
    <tr style="${rowStyle}">
      <td data-label="Nombre"><strong>${escHtml(s.nombre)}</strong>${vacia ? ' <span style="font-size:11px;color:#dc2626;font-weight:600">VACÍA</span>' : ''}</td>
      <td data-label="Grado">${s.nivelGrado ? s.nivelGrado + '°' : '—'}</td>
      <td data-label="Docente">${escHtml(s.docenteNombreCompleto) || '<span style="color:#9ca3af">Sin asignar</span>'}</td>
      <td data-label="Estudiantes" style="${vacia ? 'color:#dc2626;font-weight:600' : ''}">${s.totalEstudiantes}</td>
      <td data-label="Capacidad">${s.capacidad ?? '—'}</td>
      <td class="td-actions">
        ${puedeEditar ? `<button class="btn-edit-sec" data-sec='${escAttr(JSON.stringify(s))}'>Editar</button>` : ''}
        ${btnEliminar}
      </td>
    </tr>`
}
