/**
 * Importar Lista PIAD
 *
 * Campos del PDF que se mapean a la BD:
 *   cedula           → estudiantes.identificacion   (requerido)
 *   primerApellido   → estudiantes.apellido1         (requerido)
 *   segundoApellido  → estudiantes.apellido2         (opcional)
 *   nombre           → estudiantes.nombre            (requerido)
 *
 * Campos del PDF que NO se guardan (se muestran solo como referencia):
 *   tipoAdecuacion   — sin columna en la BD actual
 *   nivel / grupo    — referencia para sección (el usuario elige la sección destino)
 *   fechaMatricula   — la fecha de matrícula se toma del campo del formulario
 *
 * Al guardar:
 *   1. POST /api/estudiantes  por cada fila
 *   2. POST /api/matriculas   para enrollarlos en la sección seleccionada
 */

import {
  extraerPIAD,
  importarEstudiantesPIAD,
  getAnioLectivoActivo,
  getSecciones,
  getNiveles,
  getCentros,
  getDocentes,
  createSeccion,
  getContextoUsuario,
} from '../api.js'
import { makeSearchableSelect } from '../utils/searchableSelect.js'

export async function renderImportarPiad(container) {
  // Cargar datos iniciales en paralelo
  let secciones = [], anioActivo = null, niveles = [], centros = [], docentes = [], ctxUsuario = null
  try {
    anioActivo = await getAnioLectivoActivo()
    ;[secciones, niveles, centros, docentes, ctxUsuario] = await Promise.all([
      getSecciones(anioActivo.id),
      getNiveles(),
      getCentros(),
      getDocentes(),
      getContextoUsuario().catch(() => null),
    ])
  } catch { /* no bloquea la carga */ }

  // Última sección REAL elegida en "Sección destino" (no vacía ni "crear nueva").
  // Sirve para heredar su docente al crear una nueva sección desde aquí.
  let seccionPreviaId = null

  /**
   * Docente a preseleccionar en "Nueva sección":
   *  1. el docente de la sección destino elegida antes de abrir el panel, o
   *  2. el propio usuario si es DOCENTE (es el encargado natural), o
   *  3. null → "Sin asignar".
   */
  function docenteOrigenId() {
    if (seccionPreviaId != null) {
      const s = secciones.find(x => x.id === seccionPreviaId)
      if (s?.docenteId) return s.docenteId
    }
    if (ctxUsuario?.rol === 'DOCENTE' && ctxUsuario.userId) return Number(ctxUsuario.userId)
    return null
  }

  const buildOpcionesSecciones = (lista) =>
    lista.map(s =>
      `<option value="${s.id}">${s.nivelGrado ? s.nivelGrado + '° — ' : ''}${s.nombre} · ${s.centroNombre || ''}${s.docenteNombreCompleto ? ' (' + s.docenteNombreCompleto + ')' : ''}</option>`
    ).join('')

  // ── Campo "Docente encargado" según el rol ──────────────────────────────────
  // DOCENTE: queda fijado a sí mismo, de solo lectura, sin lista de otros
  // docentes — un docente nunca puede asignar la sección a otro profesor.
  // ADMIN u otros roles de gestión: selector con búsqueda, "Sin asignar" por
  // defecto y preselección del docente de la sección de origen si existe.
  const esDocente = ctxUsuario?.rol === 'DOCENTE'
  const docenteNombrePropio = ctxUsuario
    ? `${ctxUsuario.nombre ?? ''} ${ctxUsuario.apellidos ?? ''}`.trim()
    : ''
  const escAttr = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  function buildDocenteFieldHtml() {
    if (esDocente) {
      return `
        <div class="form-group" style="margin-bottom:0">
          <label>Docente encargado
            <span style="font-size:11px;color:#64748b;font-weight:400"> (asignado automáticamente)</span>
          </label>
          <input type="text" id="ns-docente-display"
            value="${escAttr(docenteNombrePropio || 'Tú (docente actual)')}"
            readonly tabindex="-1"
            title="Como docente, la sección queda asignada a tu usuario y no puede reasignarse"
            style="background:#f1f5f9;color:#475569;cursor:not-allowed">
        </div>`
    }
    return `
      <div class="form-group" style="margin-bottom:0">
        <label>Docente encargado
          <span style="font-size:11px;color:#64748b;font-weight:400"> (opcional)</span>
        </label>
        <select id="ns-docente">
          <option value="">— Sin asignar —</option>
          ${docentes.map(d => `<option value="${d.id}">${escAttr(d.nombreCompleto)}</option>`).join('')}
        </select>
      </div>`
  }

  container.innerHTML = `
    <h1>Importar Lista PIAD</h1>
    <p class="page-desc">
      Sube el PDF de Lista PIAD generado por SIGCE. Solo se importan los campos compatibles
      con la base de datos: <strong>cédula, apellidos y nombre</strong>.
      El tipo de adecuación y la fecha de matrícula del PDF se ignoran.
    </p>

    <!-- Paso 1: subir archivo -->
    <div class="card">
      <h2>1. Seleccionar archivo</h2>
      <div id="drop-zone">
        <div id="drop-inner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <p id="drop-label">Arrastra el PDF aquí o haz clic para seleccionar</p>
          <p style="font-size:12px;color:#aaa;margin:0">Solo archivos PDF</p>
        </div>
        <input type="file" id="file-input" accept=".pdf,application/pdf" style="display:none" />
      </div>
      <div id="upload-msg" style="margin-top:12px"></div>
      <div class="btn-row" style="margin-top:16px">
        <button id="btn-extraer" class="btn btn-primary" disabled>Extraer datos</button>
      </div>
    </div>

    <!-- Paso 2: revisar y guardar -->
    <div id="resultado-card" class="card" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <h2 style="margin:0">2. Revisar y guardar</h2>
        <span id="conteo-badge" class="badge badge-green"></span>
      </div>

      <!-- Aviso de campos ignorados -->
      <div style="
        background:#fffbeb;border:1px solid #fde68a;border-radius:8px;
        padding:10px 14px;margin-bottom:16px;font-size:12px;color:#92400e;
        display:flex;align-items:flex-start;gap:8px
      ">
        <span style="display:inline-flex;width:16px;height:16px;flex-shrink:0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>
        <span>
          <strong>Campos ignorados del PDF:</strong> Tipo de adecuación y Fecha de matrícula —
          no tienen columna en la base de datos actual. El nivel y grupo aparecen como referencia pero no se guardan en el estudiante.
        </span>
      </div>

      <!-- Sección destino + fecha matrícula -->
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px">
        <div class="form-group" style="min-width:300px;margin-bottom:0">
          <label>Sección destino <span style="color:#dc2626">*</span></label>
          <select id="sel-seccion-destino">
            <option value="">— Seleccione una sección —</option>
            ${buildOpcionesSecciones(secciones)}
            <option value="__nueva__" style="color:#2563eb;font-weight:600">+ Crear nueva sección…</option>
          </select>
        </div>
        <div class="form-group" style="min-width:160px;margin-bottom:0">
          <label>Fecha de matrícula</label>
          <input type="date" id="fecha-matricula" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>

      <!-- Panel "crear nueva sección" -->
      <div id="panel-nueva-seccion" style="display:none;
        background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;
        padding:20px;margin-bottom:16px;margin-top:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:15px;color:#0369a1">Nueva sección</h3>
          <button id="btn-cerrar-nueva-seccion" style="
            border:none;background:none;cursor:pointer;color:#64748b;
            font-size:20px;line-height:1;padding:0 4px" title="Cancelar">×</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">

          <div class="form-group" style="margin-bottom:0">
            <label>Nombre de la sección <span style="color:#dc2626">*</span>
              <span style="font-size:11px;color:#64748b;font-weight:400"> (ej. A, B, C)</span>
            </label>
            <input type="text" id="ns-nombre" placeholder="A" maxlength="10"
              style="text-transform:uppercase">
          </div>

          <div class="form-group" style="margin-bottom:0">
            <label>Nivel (grado) <span style="color:#dc2626">*</span></label>
            <select id="ns-nivel">
              <option value="">— Seleccione —</option>
              ${niveles.map(n => `<option value="${n.id}">${n.numeroGrado}° — ${n.nombre}</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom:0">
            <label>Centro educativo <span style="color:#dc2626">*</span></label>
            <select id="ns-centro">
              <option value="">— Seleccione —</option>
              ${centros.map(c => `<option value="${c.id}">${c.nombre}${c.circuito ? ' (' + c.circuito + ')' : ''}</option>`).join('')}
            </select>
          </div>

          ${buildDocenteFieldHtml()}

          <div class="form-group" style="margin-bottom:0">
            <label>Capacidad
              <span style="font-size:11px;color:#64748b;font-weight:400"> (opcional)</span>
            </label>
            <input type="number" id="ns-capacidad" placeholder="30" min="1" max="60">
          </div>

        </div>
        <div id="ns-error" style="margin-top:12px;font-size:13px;color:#dc2626"></div>
        <div style="margin-top:16px;display:flex;gap:10px">
          <button id="btn-crear-seccion" class="btn btn-primary">Crear sección</button>
          <button id="btn-cancelar-nueva-seccion" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>

      <!-- Tabla -->
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
        Puedes editar cualquier campo antes de guardar. Las columnas <em>Nivel</em> y <em>Grupo</em>
        son solo referencia del PDF.
      </p>
      <div style="overflow-x:auto">
        <table id="tabla-piad" style="width:100%;border-collapse:collapse;font-size:13px;min-width:700px">
          <thead>
            <tr style="background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted)">
              <th style="padding:8px 10px;text-align:center;width:36px">#</th>
              <th style="padding:8px 10px;text-align:left;width:120px">Cédula <span style="color:#dc2626">*</span></th>
              <th style="padding:8px 10px;text-align:left;width:150px">Apellido 1 <span style="color:#dc2626">*</span></th>
              <th style="padding:8px 10px;text-align:left;width:150px">Apellido 2</th>
              <th style="padding:8px 10px;text-align:left">Nombre(s) <span style="color:#dc2626">*</span></th>
              <th style="padding:8px 10px;text-align:center;width:130px;color:#9ca3af">Nivel (ref.)</th>
              <th style="padding:8px 10px;text-align:center;width:80px;color:#9ca3af">Grupo (ref.)</th>
              <th style="padding:8px 10px;text-align:center;width:40px"></th>
            </tr>
          </thead>
          <tbody id="tbody-piad"></tbody>
        </table>
      </div>

      <!-- Resultado del guardado -->
      <div id="save-result" style="margin-top:14px"></div>

      <div class="btn-row" style="margin-top:20px">
        <button id="btn-guardar" class="btn btn-primary">Guardar en sistema</button>
        <button id="btn-limpiar" class="btn btn-secondary">Nueva importación</button>
      </div>
    </div>

    <style>
      #drop-zone {
        border:2px dashed #d1d5db;border-radius:10px;padding:40px 24px;
        text-align:center;cursor:pointer;transition:border-color .2s,background .2s;
      }
      #drop-zone.drag-over { border-color:#3b82f6;background:#eff6ff }
      #drop-zone.has-file  { border-color:#10b981;background:#f0fdf4 }
      #drop-inner p { margin:8px 0 0;color:#555 }
      .ci {
        width:100%;border:1px solid transparent;border-radius:4px;
        padding:5px 7px;font-size:13px;background:transparent;
        transition:border-color .15s,background .15s;box-sizing:border-box;
      }
      .ci:hover,.ci:focus { border-color:#93c5fd;background:#fff;outline:none }
      .ci.error { border-color:#fca5a5!important;background:#fff1f2!important }
      #tabla-piad tbody tr:hover { background:#f8faff }
      #tabla-piad tbody td { padding:3px 6px;vertical-align:middle;border-bottom:1px solid #f3f4f6 }
      #spinner {
        display:inline-block;width:16px;height:16px;
        border:2px solid #e5e7eb;border-top-color:#3b82f6;
        border-radius:50%;animation:spin .7s linear infinite;
        vertical-align:middle;margin-right:6px;
      }
      @keyframes spin { to { transform:rotate(360deg) } }
    </style>
  `

  const dropZone     = container.querySelector('#drop-zone')
  const fileInput    = container.querySelector('#file-input')
  const dropLabel    = container.querySelector('#drop-label')
  const uploadMsg    = container.querySelector('#upload-msg')
  const btnExtraer   = container.querySelector('#btn-extraer')
  const resultCard   = container.querySelector('#resultado-card')
  const tbodyPiad    = container.querySelector('#tbody-piad')
  const conteoBadge  = container.querySelector('#conteo-badge')
  const btnGuardar   = container.querySelector('#btn-guardar')
  const btnLimpiar   = container.querySelector('#btn-limpiar')
  const saveResult   = container.querySelector('#save-result')
  const selSeccion   = container.querySelector('#sel-seccion-destino')
  const panelNueva   = container.querySelector('#panel-nueva-seccion')

  let archivoSeleccionado = null

  // ── Selectores con búsqueda (centro y docente) ──────────────────────────────
  // Ambos campos pueden tener muchas opciones. Se mejoran con un buscador por
  // nombre; el <select> oculto sigue guardando el ID (lo que lee el guardado).
  const centroCombo  = makeSearchableSelect(container.querySelector('#ns-centro'),
    { placeholder: 'Buscar centro educativo…' })
  // Para DOCENTE el campo es de solo lectura (no hay <select id="ns-docente">),
  // así que no se crea combo; el guardado usará el id del usuario autenticado.
  const docenteSelectEl = container.querySelector('#ns-docente')
  const docenteCombo = docenteSelectEl
    ? makeSearchableSelect(docenteSelectEl, { placeholder: 'Buscar docente… (opcional)' })
    : null

  // ── Selección de archivo ────────────────────────────────────────────────────
  function seleccionarArchivo(file) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      uploadMsg.innerHTML = '<div class="alert alert-error">El archivo debe ser un PDF.</div>'
      return
    }
    archivoSeleccionado = file
    dropLabel.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="display:inline;vertical-align:-2px;margin-right:4px"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>${file.name} (${(file.size / 1024).toFixed(0)} KB)`
    dropZone.classList.add('has-file')
    uploadMsg.innerHTML = ''
    btnExtraer.disabled = false
  }

  dropZone.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => seleccionarArchivo(fileInput.files[0]))
  dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over') })
  dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'))
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over')
    seleccionarArchivo(e.dataTransfer.files[0])
  })

  // ── Panel "Nueva sección" ───────────────────────────────────────────────────
  selSeccion.addEventListener('change', () => {
    if (selSeccion.value === '__nueva__') {
      panelNueva.style.display = ''
      // Heredar el docente de la sección actual/origen (editable por el usuario).
      const dId = docenteOrigenId()
      docenteCombo?.setValue(dId != null && docentes.some(d => String(d.id) === String(dId)) ? dId : '')
      container.querySelector('#ns-nombre').focus()
    } else {
      // Recordar la última sección real elegida para heredar su docente.
      if (selSeccion.value) seccionPreviaId = Number(selSeccion.value)
      panelNueva.style.display = 'none'
    }
  })

  function cerrarPanelNuevaSeccion() {
    panelNueva.style.display = 'none'
    // Volver a "Seleccione una sección" si no hay otra opción elegida
    if (selSeccion.value === '__nueva__') {
      selSeccion.value = ''
    }
  }

  container.querySelector('#btn-cerrar-nueva-seccion').addEventListener('click', cerrarPanelNuevaSeccion)
  container.querySelector('#btn-cancelar-nueva-seccion').addEventListener('click', cerrarPanelNuevaSeccion)

  container.querySelector('#btn-crear-seccion').addEventListener('click', async () => {
    const nsNombre    = container.querySelector('#ns-nombre').value.trim().toUpperCase()
    const nsNivelId   = Number(container.querySelector('#ns-nivel').value)
    const nsCentroId  = Number(container.querySelector('#ns-centro').value)
    // DOCENTE: siempre su propio id (el backend además lo fuerza como titular e
    // ignora este campo para ese rol). ADMIN/otros: lo que haya elegido en el select.
    const nsDocenteId = esDocente
      ? (ctxUsuario?.userId ? Number(ctxUsuario.userId) : null)
      : (docenteSelectEl && docenteSelectEl.value ? Number(docenteSelectEl.value) : null)
    const nsCapacidad = container.querySelector('#ns-capacidad').value
    const nsError     = container.querySelector('#ns-error')
    const btnCrear    = container.querySelector('#btn-crear-seccion')

    nsError.textContent = ''

    // Validar campos requeridos
    if (!nsNombre) { nsError.textContent = 'El nombre de la sección es requerido (ej. A, B, C).'; return }
    if (!nsNivelId)  { nsError.textContent = 'Selecciona el nivel (grado) de la sección.'; return }
    if (!nsCentroId) { nsError.textContent = 'Selecciona el centro educativo.'; return }
    if (!anioActivo?.id) { nsError.textContent = 'No se pudo obtener el año lectivo activo.'; return }

    btnCrear.disabled = true
    btnCrear.textContent = 'Creando…'

    try {
      const payload = {
        nombre:        nsNombre,
        nivelId:       nsNivelId,
        centroId:      nsCentroId,
        anioLectivoId: anioActivo.id,
        docenteId:     nsDocenteId,
        capacidad:     nsCapacidad ? Number(nsCapacidad) : null,
      }
      const nuevaSeccion = await createSeccion(payload)

      // Agregar la nueva sección al selector y seleccionarla
      secciones.push(nuevaSeccion)
      const opt = document.createElement('option')
      opt.value = nuevaSeccion.id
      opt.textContent = `${nuevaSeccion.nivelGrado ? nuevaSeccion.nivelGrado + '° — ' : ''}${nuevaSeccion.nombre} · ${nuevaSeccion.centroNombre || ''}${nuevaSeccion.docenteNombreCompleto ? ' (' + nuevaSeccion.docenteNombreCompleto + ')' : ''}`

      // Insertar antes del último option ("+ Crear nueva sección…")
      const ultimaOpcion = selSeccion.querySelector('option[value="__nueva__"]')
      selSeccion.insertBefore(opt, ultimaOpcion)
      selSeccion.value = nuevaSeccion.id

      panelNueva.style.display = 'none'

      // Limpiar campos del panel para próxima vez
      container.querySelector('#ns-nombre').value    = ''
      container.querySelector('#ns-nivel').value     = ''
      centroCombo?.setValue('')    // limpia el combo de centro (select oculto + texto)
      docenteCombo?.setValue('')   // limpia el combo de docente
      container.querySelector('#ns-capacidad').value = ''
      container.querySelector('#ns-error').textContent = ''
    } catch (err) {
      nsError.textContent = `Error al crear sección: ${err.message}`
    } finally {
      btnCrear.disabled = false
      btnCrear.textContent = 'Crear sección'
    }
  })

  // ── Extracción ──────────────────────────────────────────────────────────────
  btnExtraer.addEventListener('click', async () => {
    if (!archivoSeleccionado) return
    btnExtraer.disabled = true
    uploadMsg.innerHTML = '<div class="alert" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe"><span id="spinner"></span> Procesando PDF con OCR, esto puede tardar unos segundos…</div>'
    resultCard.style.display = 'none'

    try {
      const datos = await extraerPIAD(archivoSeleccionado)

      if (!datos || datos.length === 0) {
        uploadMsg.innerHTML = '<div class="alert alert-error">No se encontraron estudiantes en el PDF. Verifica que sea una Lista PIAD válida.</div>'
        btnExtraer.disabled = false
        return
      }

      uploadMsg.innerHTML = '<div class="alert alert-success">Extracción completada. Revisa los datos y selecciona la sección antes de guardar.</div>'
      conteoBadge.textContent = `${datos.length} estudiante${datos.length !== 1 ? 's' : ''} extraído${datos.length !== 1 ? 's' : ''}`
      tbodyPiad.innerHTML = datos.map(filaEditable).join('')
      saveResult.innerHTML = ''
      resultCard.style.display = ''
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      uploadMsg.innerHTML = `<div class="alert alert-error">Error al extraer: ${err.message}</div>`
      btnExtraer.disabled = false
    }
  })

  // ── Guardar ─────────────────────────────────────────────────────────────────
  // Una sola llamada idempotente al backend (POST /api/piad/importar): por cada
  // estudiante reutiliza el registro si ya existe, lo crea si es nuevo y lo
  // matricula en la sección solo si aún no pertenece a ella. No falla por
  // duplicados ni se detiene a mitad del lote.
  btnGuardar.addEventListener('click', async () => {
    const seccionId = selSeccion.value && selSeccion.value !== '__nueva__' ? Number(selSeccion.value) : null
    const fechaMat  = container.querySelector('#fecha-matricula').value

    if (!seccionId) {
      saveResult.innerHTML = '<div class="alert alert-error">Selecciona la sección destino antes de guardar.</div>'
      return
    }
    if (!anioActivo?.id) {
      saveResult.innerHTML = '<div class="alert alert-error">No se pudo determinar el año lectivo activo. Recarga la página e inténtalo de nuevo.</div>'
      return
    }

    // Leer filas de la tabla
    const filas = [...tbodyPiad.querySelectorAll('tr')]
    if (filas.length === 0) {
      saveResult.innerHTML = '<div class="alert alert-error">No hay estudiantes en la tabla.</div>'
      return
    }

    // Solo se persisten estos campos (igual que el alta manual). Nivel/grupo del
    // PDF son referencia y no se envían. Obligatorios: identificación, apellido1, nombre.
    let valido = true
    const estudiantes = filas.map(tr => {
      ;['cedula', 'primerApellido', 'nombre'].forEach(campo => {
        const input = tr.querySelector(`[name=${campo}]`)
        const val = input.value.trim()
        input.classList.toggle('error', !val)
        if (!val) valido = false
      })
      return {
        identificacion: tr.querySelector('[name=cedula]').value.trim(),
        nombre:         tr.querySelector('[name=nombre]').value.trim(),
        apellido1:      tr.querySelector('[name=primerApellido]').value.trim(),
        apellido2:      tr.querySelector('[name=segundoApellido]').value.trim() || null,
      }
    })

    if (!valido) {
      saveResult.innerHTML = '<div class="alert alert-error">Hay campos requeridos vacíos (marcados en rojo). Corrígelos antes de continuar.</div>'
      return
    }

    btnGuardar.disabled = true
    btnGuardar.textContent = 'Guardando…'
    saveResult.innerHTML = ''

    try {
      const res = await importarEstudiantesPIAD({
        seccionId,
        anioLectivoId:  anioActivo.id,
        fechaMatricula: fechaMat || null,
        estudiantes,
      })

      const partes = []
      if (res.creados)        partes.push(`${res.creados} nuevo${res.creados !== 1 ? 's' : ''} creado${res.creados !== 1 ? 's' : ''}`)
      if (res.matriculados)   partes.push(`${res.matriculados} matriculado${res.matriculados !== 1 ? 's' : ''}`)
      if (res.yaMatriculados) partes.push(`${res.yaMatriculados} ya en la sección`)
      const resumen = partes.length ? partes.join(' · ') : 'sin cambios'

      let html = `
        <div class="alert alert-success">
          Importación completada: ${resumen}.
          <div style="font-size:12px;margin-top:4px;color:#065f46">
            ${res.total} fila${res.total !== 1 ? 's' : ''} procesada${res.total !== 1 ? 's' : ''} ·
            ${res.creados} creado${res.creados !== 1 ? 's' : ''} ·
            ${res.reutilizados} reutilizado${res.reutilizados !== 1 ? 's' : ''} (ya existían) ·
            ${res.yaMatriculados} omitido${res.yaMatriculados !== 1 ? 's' : ''} (ya en la sección)
          </div>
        </div>`

      if (res.errores > 0) {
        const fallidas = (res.detalle || []).filter(d => d.estado === 'ERROR')
        html += `
          <div class="alert alert-error" style="margin-top:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" style="display:inline;vertical-align:-2px;margin-right:3px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ${res.errores} fila${res.errores !== 1 ? 's' : ''} con error:<br>
            ${fallidas.map(d => `• ${d.identificacion}: ${d.mensaje}`).join('<br>')}
          </div>`
      }
      saveResult.innerHTML = html
    } catch (e) {
      saveResult.innerHTML = `<div class="alert alert-error">Error al importar: ${e.message}</div>`
    } finally {
      btnGuardar.disabled = false
      btnGuardar.textContent = 'Guardar en sistema'
    }
  })

  // ── Nueva importación ───────────────────────────────────────────────────────
  btnLimpiar.addEventListener('click', () => {
    archivoSeleccionado = null
    fileInput.value = ''
    dropLabel.textContent = 'Arrastra el PDF aquí o haz clic para seleccionar'
    dropZone.classList.remove('has-file', 'drag-over')
    uploadMsg.innerHTML = ''
    btnExtraer.disabled = true
    resultCard.style.display = 'none'
    tbodyPiad.innerHTML = ''
    saveResult.innerHTML = ''
    panelNueva.style.display = 'none'
  })
}

// ── Fila editable ─────────────────────────────────────────────────────────────
function filaEditable(est) {
  const nivelBadge = est.nivel
    ? `<span style="font-size:11px;background:#f3f4f6;color:#6b7280;padding:2px 7px;border-radius:20px">${est.nivel}</span>`
    : '—'
  const grupoBadge = est.grupo
    ? `<span style="font-size:11px;background:#f3f4f6;color:#6b7280;padding:2px 7px;border-radius:20px">${est.grupo}</span>`
    : '—'

  return `
    <tr>
      <td style="text-align:center;color:#9ca3af;font-size:12px">${est.numero}</td>
      <td><input class="ci" name="cedula"          value="${est.cedula          || ''}"></td>
      <td><input class="ci" name="primerApellido"  value="${est.primerApellido  || ''}"></td>
      <td><input class="ci" name="segundoApellido" value="${est.segundoApellido || ''}"></td>
      <td><input class="ci" name="nombre"          value="${est.nombre          || ''}"></td>
      <td style="text-align:center">${nivelBadge}</td>
      <td style="text-align:center">${grupoBadge}</td>
      <td style="text-align:center">
        <button onclick="this.closest('tr').remove()" title="Eliminar fila"
          style="border:none;background:none;cursor:pointer;color:#9ca3af;font-size:16px;padding:2px 4px">×</button>
      </td>
    </tr>`
}
