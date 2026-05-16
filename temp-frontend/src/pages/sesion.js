import { getMe, logout, cambiarPassword } from '../api.js'

const ROL_LABEL = {
  ADMIN:        'Administrador',
  DOCENTE:      'Docente',
  COORDINADOR:  'Coordinador',
}
const ROL_BADGE = {
  ADMIN:        'badge-blue',
  DOCENTE:      'badge-green',
  COORDINADOR:  'badge-yellow',
}

// Iconos SVG inline (estilo Lucide, 20x20, stroke currentColor)
const ICONS = {
  user:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  mail:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
  shield:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z"/></svg>`,
  hash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>`,
  layers:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>`,
  book:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2V4z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8V4z"/></svg>`,
  logout:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  key:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
}

export async function renderSesion(container) {
  container.innerHTML = '<p class="loading">Cargando sesión…</p>'

  const me = await getMe()
  if (!me) return

  const rolLabel  = ROL_LABEL[me.rol]  ?? me.rol
  const rolBadge  = ROL_BADGE[me.rol]  ?? 'badge-gray'
  const iniciales = [me.nombre, me.apellidos]
    .filter(Boolean)
    .map(s => s[0].toUpperCase())
    .join('')
    .slice(0, 2)

  const hasSecciones = Array.isArray(me.seccionIds) && me.seccionIds.length > 0
  const hasMaterias  = Array.isArray(me.materiaIds) && me.materiaIds.length > 0

  container.innerHTML = `
    <div class="sesion-page">

      <!-- ═══ Hero / banner ═══ -->
      <section class="sesion-hero">
        <div class="sesion-hero-bg" aria-hidden="true"></div>
        <div class="sesion-hero-content">
          <div class="sesion-avatar">${iniciales}</div>
          <div class="sesion-hero-info">
            <h1 class="sesion-name">${escHtml(me.nombre)} ${escHtml(me.apellidos)}</h1>
            <div class="sesion-meta">
              <span class="badge ${rolBadge} sesion-rol-badge">${rolLabel}</span>
              <span class="sesion-email">
                <span class="sesion-meta-icon">${ICONS.mail}</span>
                ${escHtml(me.correo)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ Grid de tarjetas ═══ -->
      <div class="sesion-grid">

        <!-- Información personal -->
        <article class="sesion-card">
          <header class="sesion-card-head">
            <span class="sesion-card-icon">${ICONS.user}</span>
            <h2 class="sesion-card-title">Información personal</h2>
          </header>
          <dl class="sesion-info-list">
            ${row(ICONS.user,   'Nombre completo', `${escHtml(me.nombre)} ${escHtml(me.apellidos)}`)}
            ${row(ICONS.mail,   'Correo electrónico', escHtml(me.correo))}
            ${row(ICONS.shield, 'Rol en el sistema',  `<span class="badge ${rolBadge}">${rolLabel}</span>`)}
            ${row(ICONS.hash,   'ID de usuario',       `<code class="sesion-code">#${escHtml(me.userId ?? '—')}</code>`)}
          </dl>
        </article>

        <!-- Asignaciones -->
        <article class="sesion-card">
          <header class="sesion-card-head">
            <span class="sesion-card-icon">${ICONS.layers}</span>
            <h2 class="sesion-card-title">Asignaciones</h2>
          </header>

          <div class="sesion-assign-block">
            <div class="sesion-assign-label">
              <span class="sesion-meta-icon">${ICONS.layers}</span>
              Secciones
              <span class="sesion-count">${hasSecciones ? me.seccionIds.length : 0}</span>
            </div>
            <div class="sesion-chips">
              ${hasSecciones
                ? me.seccionIds.map(id => `<span class="sesion-chip sesion-chip-blue">Sección ${escHtml(id)}</span>`).join('')
                : `<span class="sesion-empty">Sin secciones asignadas</span>`}
            </div>
          </div>

          <div class="sesion-assign-block">
            <div class="sesion-assign-label">
              <span class="sesion-meta-icon">${ICONS.book}</span>
              Materias
              <span class="sesion-count">${hasMaterias ? me.materiaIds.length : 0}</span>
            </div>
            <div class="sesion-chips">
              ${hasMaterias
                ? me.materiaIds.map(id => `<span class="sesion-chip sesion-chip-green">Materia ${escHtml(id)}</span>`).join('')
                : `<span class="sesion-empty">Sin materias asignadas</span>`}
            </div>
          </div>
        </article>

      </div>

      <!-- ═══ Acciones ═══ -->
      <section class="sesion-actions-card">
        <div class="sesion-actions-info">
          <div class="sesion-actions-title">Cambiar contraseña</div>
          <div class="sesion-actions-desc">Reemplaza tu contraseña actual por una nueva. Tu sesión seguirá activa.</div>
        </div>
        <button class="btn btn-primary sesion-logout-btn" id="btn-toggle-pwd">
          <span class="sesion-meta-icon">${ICONS.key}</span>
          <span>Cambiar contraseña</span>
        </button>
      </section>

      <!-- Formulario inline de cambio de contraseña (oculto por defecto) -->
      <section id="pwd-form-card" class="sesion-actions-card" style="display:none;flex-direction:column;align-items:stretch;gap:14px">
        <div>
          <div class="sesion-actions-title">Nueva contraseña</div>
          <div class="sesion-actions-desc">Mínimo 8 caracteres. Debe ser distinta a la actual.</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:10px;max-width:420px">
          <div class="form-group" style="margin:0">
            <label style="font-size:12px">Contraseña actual</label>
            <input type="password" id="pwd-actual" autocomplete="current-password" placeholder="Contraseña actual">
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:12px">Nueva contraseña</label>
            <input type="password" id="pwd-nueva" autocomplete="new-password" placeholder="Mínimo 8 caracteres">
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:12px">Confirmar nueva contraseña</label>
            <input type="password" id="pwd-confirm" autocomplete="new-password" placeholder="Repite la nueva contraseña">
          </div>
        </div>
        <div id="pwd-msg" style="font-size:13px;min-height:18px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" id="btn-pwd-save">Guardar nueva contraseña</button>
          <button class="btn btn-secondary" id="btn-pwd-cancel">Cancelar</button>
        </div>
      </section>

      <section class="sesion-actions-card">
        <div class="sesion-actions-info">
          <div class="sesion-actions-title">Cerrar sesión</div>
          <div class="sesion-actions-desc">Saldrás del sistema y deberás ingresar tus credenciales nuevamente.</div>
        </div>
        <button class="btn btn-danger sesion-logout-btn" id="btn-logout">
          <span class="sesion-meta-icon">${ICONS.logout}</span>
          <span>Cerrar sesión</span>
        </button>
      </section>

      <div id="logout-msg" class="sesion-logout-msg"></div>

    </div>
  `

  container.querySelector('#btn-logout').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-logout')
    const logoutMsg = container.querySelector('#logout-msg')
    btn.disabled = true
    btn.querySelector('span:last-child').textContent = 'Cerrando sesión…'
    logoutMsg.innerHTML = '<div class="alert alert-info" style="font-size:13px">Cerrando tu sesión, espera un momento…</div>'
    await logout()
    window.dispatchEvent(new CustomEvent('atara:session-expired'))
  })

  // ── Cambio de contraseña ──────────────────────────────────────────────────
  const pwdCard    = container.querySelector('#pwd-form-card')
  const pwdToggle  = container.querySelector('#btn-toggle-pwd')
  const pwdActual  = container.querySelector('#pwd-actual')
  const pwdNueva   = container.querySelector('#pwd-nueva')
  const pwdConfirm = container.querySelector('#pwd-confirm')
  const pwdMsg     = container.querySelector('#pwd-msg')
  const pwdSave    = container.querySelector('#btn-pwd-save')
  const pwdCancel  = container.querySelector('#btn-pwd-cancel')

  function resetPwdForm() {
    pwdActual.value = ''
    pwdNueva.value = ''
    pwdConfirm.value = ''
    pwdMsg.textContent = ''
    pwdMsg.style.color = ''
    pwdSave.disabled = false
    pwdSave.textContent = 'Guardar nueva contraseña'
  }

  function cerrarPwd() {
    pwdCard.style.display = 'none'
    pwdToggle.disabled = false
    resetPwdForm()
  }

  pwdToggle.addEventListener('click', () => {
    const abrir = pwdCard.style.display === 'none'
    pwdCard.style.display = abrir ? 'flex' : 'none'
    if (abrir) {
      resetPwdForm()
      pwdActual.focus()
      pwdCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })

  pwdCancel.addEventListener('click', cerrarPwd)

  pwdSave.addEventListener('click', async () => {
    pwdMsg.style.color = '#dc2626'
    const actual  = pwdActual.value
    const nueva   = pwdNueva.value
    const confirm = pwdConfirm.value
    if (!actual || !nueva || !confirm) {
      pwdMsg.textContent = 'Completa los tres campos.'
      return
    }
    if (nueva.length < 8) {
      pwdMsg.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.'
      return
    }
    if (nueva !== confirm) {
      pwdMsg.textContent = 'La nueva contraseña y su confirmación no coinciden.'
      return
    }
    if (nueva === actual) {
      pwdMsg.textContent = 'La nueva contraseña debe ser distinta a la actual.'
      return
    }
    pwdSave.disabled = true
    pwdSave.textContent = 'Guardando…'
    pwdMsg.style.color = ''
    pwdMsg.textContent = ''
    try {
      await cambiarPassword(actual, nueva)
      pwdMsg.style.color = '#16a34a'
      pwdMsg.textContent = '✓ Contraseña actualizada correctamente.'
      // Auto-cerrar el formulario tras 1.5s
      setTimeout(cerrarPwd, 1500)
    } catch (e) {
      pwdMsg.style.color = '#dc2626'
      pwdMsg.textContent = e.message
      pwdSave.disabled = false
      pwdSave.textContent = 'Guardar nueva contraseña'
    }
  })

  // Enter en el último campo dispara guardar
  pwdConfirm.addEventListener('keydown', e => {
    if (e.key === 'Enter') pwdSave.click()
  })
}

function row(icon, label, value) {
  return `
    <div class="sesion-info-row">
      <span class="sesion-info-icon">${icon}</span>
      <dt class="sesion-info-label">${label}</dt>
      <dd class="sesion-info-value">${value}</dd>
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
