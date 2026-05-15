// secciones-wizard.js — helpers de UI para el wizard de "Nueva/Editar sección".
// Mantiene el HTML del modal y las tarjetas de estudiante separados de
// secciones.js para evitar que el archivo principal crezca demasiado.

export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
}

export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  try {
    const hoy = new Date()
    const fn  = new Date(fechaNacimiento)
    if (isNaN(fn.getTime())) return null
    let edad = hoy.getFullYear() - fn.getFullYear()
    const m = hoy.getMonth() - fn.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--
    return edad >= 0 ? edad : null
  } catch { return null }
}

export function generoLabel(g) {
  if (g === 'M') return 'Masculino'
  if (g === 'F') return 'Femenino'
  if (g === 'O') return 'Otro'
  return g || ''
}

/**
 * HTML para una tarjeta de estudiante en el selector split.
 * action: 'add' (botón verde +) o 'remove' (botón rojo ×).
 */
export function studentCardHtml(e, action) {
  const nombre = `${e.nombre || ''} ${e.apellido1 || ''} ${e.apellido2 || ''}`.trim()
  const initials = ((e.nombre || '?')[0] + (e.apellido1 || '?')[0]).toUpperCase()
  const edad = calcularEdad(e.fechaNacimiento)
  const meta = []
  if (e.identificacion) meta.push(`<span class="ced">${escHtml(e.identificacion)}</span>`)
  if (edad != null)     meta.push(`${edad} años`)
  if (e.genero)         meta.push(generoLabel(e.genero))

  const actionBtn = action === 'add'
    ? `<button class="student-action" title="Agregar a la sección">+</button>`
    : `<button class="student-action remove" title="Quitar de la sección">×</button>`
  const genderClass = e.genero ? `gender-${e.genero}` : ''

  return `
    <li class="student-card" data-id="${e.id}" title="Doble clic para ${action === 'add' ? 'agregar' : 'quitar'}">
      <div class="student-avatar ${genderClass}">${escHtml(initials)}</div>
      <div class="student-info">
        <div class="student-name">${escHtml(nombre)}</div>
        <div class="student-meta">${meta.join(' · ')}</div>
      </div>
      ${actionBtn}
    </li>
  `
}

/**
 * HTML completo del wizard (datos básicos + co-docentes + selector split de estudiantes).
 * v: valores iniciales para edición ({nombre, nivelId, centroId, docenteId, capacidad}).
 * flags: { esDocente, esAdmin, esEdicion }.
 */
export function seccionWizardHtml(
  { niveles = [], centros = [], docentes = [] } = {},
  v = {},
  { esDocente, esAdmin, esEdicion } = {}
) {
  const nivelOpts = niveles.map(n =>
    `<option value="${n.id}" ${Number(v.nivelId) === n.id ? 'selected' : ''}>${n.numeroGrado}° — ${escHtml(n.nombre)}</option>`
  ).join('')
  const centroOpts = centros.map(c =>
    `<option value="${c.id}" ${Number(v.centroId) === c.id ? 'selected' : ''}>${escHtml(c.nombre)}</option>`
  ).join('')
  const docenteOpts = docentes.map(d =>
    `<option value="${d.id}" ${Number(v.docenteId) === d.id ? 'selected' : ''}>${escHtml(d.nombreCompleto)}</option>`
  ).join('')

  const titularBlock = esAdmin
    ? `<div class="form-group" style="grid-column: 1 / -1">
         <label>Docente titular <span style="color:#9ca3af">(opcional)</span></label>
         <select id="sf-docente">
           <option value="">— Sin asignar —</option>
           ${docenteOpts}
         </select>
       </div>`
    : `<div class="form-group" style="grid-column: 1 / -1">
         <div class="alert alert-info" style="margin:0;font-size:12.5px">
           ${esEdicion
             ? 'Eres el <strong>docente titular</strong> de esta sección.'
             : 'Quedarás registrado automáticamente como <strong>docente titular</strong> de esta sección.'}
         </div>
       </div>`

  return `
    <div class="form-grid">
      <div class="form-group">
        <label>Nombre (letra/grupo) *</label>
        <input id="sf-nombre" value="${escAttr(v.nombre || '')}" placeholder="Ej: A, B, 7-1…" maxlength="10" required />
      </div>
      <div class="form-group">
        <label>Nivel / Grado *</label>
        <select id="sf-nivel">
          <option value="">— Seleccione —</option>
          ${nivelOpts}
        </select>
      </div>
      <div class="form-group">
        <label>Centro educativo *</label>
        <select id="sf-centro">
          <option value="">— Seleccione —</option>
          ${centroOpts}
        </select>
      </div>
      <div class="form-group">
        <label>Capacidad <span style="color:#9ca3af">(opcional)</span></label>
        <input id="sf-capacidad" type="number" min="1" max="99" value="${escAttr(v.capacidad || '')}" placeholder="Nº máx. estudiantes" />
      </div>
      ${titularBlock}
    </div>

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

    <div class="wizard-section">
      <h4>Estudiantes a matricular</h4>
      <p style="font-size:12px;color:#6b7280;margin:0 0 10px">
        Busca por <strong>nombre</strong> o <strong>cédula</strong> en la columna izquierda.
        Haz clic en <strong>+</strong> o doble clic en una tarjeta para agregarla.
        Para quitar uno: clic en <strong>×</strong> o doble clic en la columna derecha.
      </p>

      <div class="student-picker">
        <div class="picker-search">
          <input id="sf-est-search" type="text"
                 placeholder="🔎 Buscar por nombre o cédula… (ej: 2018-1099)" />
        </div>
        <div class="picker-cols">
          <div class="picker-col">
            <h5>Disponibles <span class="col-count" id="sf-est-disp-count">0</span></h5>
            <ul id="sf-est-disponibles" class="picker-list"></ul>
          </div>
          <div class="picker-col">
            <h5 class="right">Seleccionados <span class="col-count" id="sf-est-sel-count">0</span></h5>
            <ul id="sf-est-seleccionados" class="picker-list"></ul>
          </div>
        </div>
      </div>
    </div>
  `
}

/** CSS del wizard. Se inserta en el <style> de la página principal. */
export const WIZARD_CSS = `
  .atara-modal-box.wide-modal { max-width:920px;width:96vw }

  .wizard-section { margin-top:18px;padding-top:14px;border-top:1px dashed #d1d5db }
  .wizard-section h4 {
    margin:0 0 10px;font-size:13px;font-weight:700;color:#0369a1;
    text-transform:uppercase;letter-spacing:.04em
  }

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
  .row-add { display:flex;gap:6px;align-items:center }
  .row-add select { flex:1 }

  .student-picker { display:flex;flex-direction:column;gap:10px }
  .student-picker .picker-search input {
    width:100%;padding:10px 12px;border-radius:8px;
    border:1px solid #cbd5e1;font-size:14px
  }
  .student-picker .picker-cols {
    display:grid;grid-template-columns:1fr 1fr;gap:14px
  }
  @media (max-width:720px) { .student-picker .picker-cols { grid-template-columns:1fr } }
  .student-picker .picker-col {
    background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
    display:flex;flex-direction:column;min-height:300px;max-height:380px
  }
  .student-picker .picker-col h5 {
    margin:0;padding:10px 14px;font-size:12px;font-weight:700;
    color:#475569;text-transform:uppercase;letter-spacing:.04em;
    border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center
  }
  .student-picker .picker-col h5 .col-count {
    background:#0ea5e9;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px
  }
  .student-picker .picker-col h5.right .col-count { background:#22c55e }
  .student-picker .picker-list {
    list-style:none;margin:0;padding:6px;flex:1;overflow-y:auto;
    display:flex;flex-direction:column;gap:6px
  }
  .student-card {
    display:flex;align-items:center;gap:10px;
    background:#fff;border:1px solid #e5e7eb;border-radius:8px;
    padding:8px 10px;cursor:pointer;transition:all .12s
  }
  .student-card:hover { border-color:#0ea5e9;background:#f0f9ff }
  .student-avatar {
    width:38px;height:38px;border-radius:50%;flex:0 0 38px;
    background:#e0f2fe;color:#0369a1;
    display:flex;align-items:center;justify-content:center;
    font-weight:700;font-size:13px;letter-spacing:.5px
  }
  .student-avatar.gender-F { background:#fce7f3;color:#9d174d }
  .student-avatar.gender-M { background:#dbeafe;color:#1e40af }
  .student-avatar.gender-O { background:#ede9fe;color:#5b21b6 }
  .student-info { flex:1;min-width:0 }
  .student-info .student-name {
    font-weight:600;color:#111827;font-size:13.5px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis
  }
  .student-info .student-meta {
    font-size:11.5px;color:#64748b;margin-top:1px;
    display:flex;gap:8px;flex-wrap:wrap
  }
  .student-info .student-meta .ced {
    font-family:ui-monospace,Menlo,monospace;color:#374151;font-weight:600
  }
  .student-action {
    background:#0ea5e9;color:#fff;border:none;
    width:26px;height:26px;border-radius:50%;
    font-size:14px;font-weight:700;cursor:pointer;line-height:1;
    display:flex;align-items:center;justify-content:center;flex:0 0 26px
  }
  .student-action.remove { background:#ef4444 }
  .student-action:hover { transform:scale(1.06) }
  .picker-empty {
    text-align:center;color:#94a3b8;font-size:12.5px;font-style:italic;
    padding:30px 10px
  }
`
