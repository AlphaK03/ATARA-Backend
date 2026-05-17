import { getMe, logout, getMaterias } from '../api.js'

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
}

export async function renderSesion(container) {
  container.innerHTML = '<p class="loading">Cargando sesión…</p>'

  const [me, catalogoMaterias] = await Promise.all([
    getMe(),
    getMaterias().catch(() => []),
  ])
  if (!me) return

  const materiaMap = new Map((catalogoMaterias || []).map(m => [m.id, m.nombre]))

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

      <!-- Encabezado de sesión -->
      <div class="sesion-header">
        <div class="sesion-avatar-sm">${iniciales}</div>
        <div>
          <div class="sesion-header-name">${escHtml(me.nombre)} ${escHtml(me.apellidos)}</div>
          <div class="sesion-header-meta">
            <span class="badge ${rolBadge}">${rolLabel}</span>
            <span class="sesion-email-text">${escHtml(me.correo)}</span>
          </div>
        </div>
      </div>

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
                ? me.materiaIds.map(id => `<span class="sesion-chip sesion-chip-green">${escHtml(materiaMap.get(id) ?? `Materia ${id}`)}</span>`).join('')
                : `<span class="sesion-empty">Sin materias asignadas</span>`}
            </div>
          </div>
        </article>

      </div>

      <!-- ═══ Acciones ═══ -->
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
