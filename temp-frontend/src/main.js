import './style.css'
import logoAtara  from './assets/images/logos/logo-atara-transparente.png'
import logoUNA    from './assets/images/logos/logo_una.webp'
import fondoLogin from './assets/images/backgrounds/fondo login.svg'
import { checkHealth, getAccessToken, getContextoUsuario, login, logout,
         clearAccessToken, clearRefreshToken, clearUserId,
         solicitarResetPassword, confirmarResetPassword, cambiarPassword } from './api.js'
import { showToast } from './utils/toast.js'
import { renderAniosLectivos }    from './pages/aniosLectivos.js'
import { renderEstudiantes }      from './pages/estudiantes.js'
import { renderAlertasTempranas } from './pages/alertasTempranas.js'
import { renderEvaluacionesSaber } from './pages/evaluacionesSaber.js'
import { renderVisualizaciones }  from './pages/visualizaciones.js'
import { renderReportes }         from './pages/reportes.js'
import { renderImportarPiad }     from './pages/importarPiad.js'
import { renderSecciones }        from './pages/secciones.js'
import { renderSesion }           from './pages/sesion.js'
import { renderAdmin }            from './pages/admin.js'
import { renderCentros }          from './pages/centros.js'
import { renderAcerca }           from './pages/acerca.js'

const pages = {
  aniosLectivos:    renderAniosLectivos,
  estudiantes:      renderEstudiantes,
  importarPiad:     renderImportarPiad,
  secciones:        renderSecciones,
  alertasTempranas: renderAlertasTempranas,
  evaluacionesSaber: renderEvaluacionesSaber,
  visualizaciones:  renderVisualizaciones,
  reportes:         renderReportes,
  sesion:           renderSesion,
  admin:            renderAdmin,
  centros:          renderCentros,
  acerca:           renderAcerca,
}

// ── Definición de menú por rol ────────────────────────────────────────────
const NAV_BY_ROL = {
  ADMIN: [
    { section: 'Administración', items: [
      { page: 'admin',   label: 'Gestión de usuarios' },
      { page: 'centros', label: 'Centros educativos' },
    ]},
    { section: 'Gestión', items: [
      { page: 'aniosLectivos', label: 'Años Lectivos' },
      { page: 'secciones',     label: 'Secciones' },
      { page: 'estudiantes',   label: 'Estudiantes' },
      { page: 'importarPiad',  label: 'Importar PIAD' },
    ]},
    { section: 'Sistema', items: [
      { page: 'acerca', label: 'Acerca de ATARA' },
    ]},
  ],
  DOCENTE: [
    { section: 'Gestión', items: [
      { page: 'secciones',         label: 'Secciones' },
      { page: 'evaluacionesSaber', label: 'Eval. por Saber' },
    ]},
    { section: 'Análisis', items: [
      { page: 'alertasTempranas', label: 'Alertas Tempranas' },
      { page: 'visualizaciones',  label: 'Visualizaciones' },
      { page: 'reportes',         label: 'Reportes' },
    ]},
    { section: 'Sistema', items: [
      { page: 'acerca', label: 'Acerca de ATARA' },
    ]},
  ],
}
NAV_BY_ROL.COORDINADOR = NAV_BY_ROL.DOCENTE

// Páginas a las que solo puede acceder ADMIN
const ADMIN_ONLY_PAGES = new Set(['admin', 'centros', 'aniosLectivos', 'estudiantes', 'importarPiad'])

const DEFAULT_PAGE = { ADMIN: 'admin', DOCENTE: 'secciones', COORDINADOR: 'secciones' }

// ── Bottom nav definition ─────────────────────────────────────────────────
const SVG_BELL  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`
const SVG_CHART = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
const SVG_USERS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`
const SVG_CAP   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 10 12 5 2 10 12 15 22 10"/><polyline points="6 12 6 17 12 21 18 17 18 12"/></svg>`
const SVG_CAL   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
const SVG_CLIP  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`

const BOTTOM_NAV_ITEMS = {
  ADMIN: [
    { page: 'admin',         label: 'Usuarios',    icon: SVG_USERS },
    { page: 'estudiantes',   label: 'Estudiantes', icon: SVG_CAP   },
    { page: 'aniosLectivos', label: 'Años',        icon: SVG_CAL   },
  ],
  DOCENTE: [
    { page: 'evaluacionesSaber', label: 'Evaluaciones', icon: SVG_CLIP  },
    { page: 'alertasTempranas',  label: 'Alertas',      icon: SVG_BELL  },
    { page: 'reportes',          label: 'Reportes',     icon: SVG_CHART },
  ],
}
BOTTOM_NAV_ITEMS.COORDINADOR = BOTTOM_NAV_ITEMS.DOCENTE

// ── Estado global ─────────────────────────────────────────────────────────
let _currentUser = null  // { userId, nombre, apellidos, rol, ... }

const content  = document.getElementById('page-content')
const navLinks = document.getElementById('nav-links')

// Logo del sidebar (importado desde assets, Vite lo resuelve con hash)
const sidebarLogoEl = document.getElementById('sidebar-logo')
if (sidebarLogoEl) sidebarLogoEl.src = logoAtara

const footerLogoEl = document.getElementById('footer-logo-una')
if (footerLogoEl) footerLogoEl.src = logoUNA

// ── Render del menú según rol ─────────────────────────────────────────────
function renderBottomNav(rol, activePage = '') {
  const nav = document.getElementById('mobile-bottom-nav')
  if (!nav) return
  const items = BOTTOM_NAV_ITEMS[rol] || []
  nav.innerHTML = items.map(item => `
    <button class="mbn-item${item.page === activePage ? ' active' : ''}" data-page="${item.page}">
      <span class="mbn-icon">${item.icon}</span>
      <span class="mbn-label">${item.label}</span>
    </button>
  `).join('')
  nav.querySelectorAll('.mbn-item').forEach(btn => {
    btn.addEventListener('click', () => { navigate(btn.dataset.page); closeSidebar() })
  })
}

function renderNav(rol) {
  const sections = NAV_BY_ROL[rol] || NAV_BY_ROL.DOCENTE
  navLinks.innerHTML = `
    <li class="nav-section-label">Usuario</li>
    <li><a href="#" data-page="sesion">Mi sesión</a></li>
    ${sections.map(s => `
      <li class="nav-section-label">${s.section}</li>
      ${s.items.map(i => `<li><a href="#" data-page="${i.page}">${i.label}</a></li>`).join('')}
    `).join('')}
  `
  // Re-bind click events para los nuevos <a>
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault()
      navigate(a.dataset.page)
      closeSidebar()
    })
  })
}

// ── Actualizar topbar ────────────────────────────────────────────────────
function updateTopbar(me) {
  if (!me) {
    document.getElementById('topbar-nombre').textContent = '—'
    document.getElementById('topbar-rol').textContent = '—'
    document.getElementById('topbar-avatar').textContent = '?'
    return
  }
  const rolLabel = { ADMIN: 'Administrador', DOCENTE: 'Docente', COORDINADOR: 'Coordinador' }[me.rol] ?? me.rol
  document.getElementById('topbar-nombre').textContent = `${me.nombre} ${me.apellidos}`
  document.getElementById('topbar-rol').textContent = rolLabel
  document.getElementById('topbar-avatar').textContent = (me.nombre?.[0] ?? '?').toUpperCase()
  document.getElementById('topbar-title').textContent =
    me.rol === 'ADMIN' ? 'Administración ATARA' : 'ATARA — Sistema de Alertas'
}

// ── Guard de navegación por rol ──────────────────────────────────────────
function canNavigate(page) {
  if (!_currentUser) return false
  if (ADMIN_ONLY_PAGES.has(page) && _currentUser.rol !== 'ADMIN') return false
  return true
}

// ── navigate ──────────────────────────────────────────────────────────────
function navigate(page, params = {}) {
  if (!getAccessToken() && page !== 'login') {
    showLogin()
    return
  }
  if (!canNavigate(page)) {
    content.innerHTML = '<p class="empty">No tienes permiso para acceder a esta sección.</p>'
    return
  }
  history.pushState({ page, params }, '', '#' + page)
  navLinks.querySelectorAll('a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page)
  })
  document.querySelectorAll('.mbn-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page)
  })
  content.innerHTML = '<p class="loading">Cargando...</p>'
  const render = pages[page]
  if (render) render(content, params)
  else content.innerHTML = '<p class="empty">Página no encontrada.</p>'
}

// ── Login ─────────────────────────────────────────────────────────────────
function showLogin(notice = '') {
  // Ocultar topbar y sidebar (layout de pantalla completa para el login)
  document.getElementById('desktop-topbar').style.display = 'none'
  document.body.classList.add('login-mode')
  updateTopbar(null)
  navLinks.innerHTML = ''

  content.innerHTML = `
    <div class="login-screen">
      <div class="login-left">
        <div class="login-card">
          <div class="login-logo-wrap">
            <img src="${logoAtara}" alt="ATARA" class="login-logo">
          </div>
          <h2 class="login-title">Inicia sesión en tu cuenta</h2>
          <form class="login-form" id="login-form" autocomplete="on">
            <div class="login-field">
              <label for="login-correo">Correo electrónico</label>
              <div class="login-input-group">
                <input type="email" id="login-correo" placeholder="usuario@correo.com" autocomplete="username">
                <span class="login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2"/>
                    <path d="M3 7l9 6 9-6"/>
                  </svg>
                </span>
              </div>
            </div>
            <div class="login-field">
              <label for="login-pass">Contraseña</label>
              <div class="login-input-group">
                <input type="password" id="login-pass" placeholder="Ingrese su contraseña" autocomplete="current-password">
                <span class="login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2"/>
                    <path d="M8 11V7a4 4 0 018 0v4"/>
                  </svg>
                </span>
              </div>
            </div>
            ${notice ? `<div class="login-notice">${notice}</div>` : ''}
            <div id="login-error" class="login-error"></div>
            <button type="submit" class="login-submit" id="login-btn">Ingresar</button>
            <button type="button" class="login-forgot" id="btn-forgot">¿Olvidaste tu contraseña?</button>
          </form>
        </div>
      </div>
      <div class="login-right">
        <img src="${fondoLogin}" alt="" class="login-illustration" aria-hidden="true">
      </div>
    </div>
  `

  const form     = content.querySelector('#login-form')
  const btn      = content.querySelector('#login-btn')
  const errorDiv = content.querySelector('#login-error')

  async function doLogin(ev) {
    ev?.preventDefault()
    const correo = content.querySelector('#login-correo').value.trim()
    const pass   = content.querySelector('#login-pass').value
    if (!correo || !pass) { errorDiv.textContent = 'Ingrese correo y contraseña.'; return }
    btn.disabled = true
    btn.textContent = 'Ingresando…'
    errorDiv.textContent = ''
    try {
      const loginData = await login(correo, pass)
      if (loginData?.debeCambiarPassword) {
        showCambiarPasswordForzado()
      } else {
        await afterLogin()
      }
    } catch (e) {
      errorDiv.textContent = e.message
      btn.disabled = false
      btn.textContent = 'Ingresar'
    }
  }

  form.addEventListener('submit', doLogin)
  content.querySelector('#btn-forgot').addEventListener('click', showResetStep1)
}

// ── Reset contraseña — paso 1: ingresar correo ────────────────────────────
function showResetStep1() {
  content.innerHTML = `
    <div class="login-screen">
      <div class="login-left">
        <div class="login-card">
          <div class="login-logo-wrap">
            <img src="${logoAtara}" alt="ATARA" class="login-logo">
          </div>
          <h2 class="login-title">Restablecer contraseña</h2>
          <p class="login-subtitle">Ingresa tu correo y te enviaremos un código de verificación.</p>
          <form class="login-form" id="reset-form-1">
            <div class="login-field">
              <label for="reset-correo">Correo electrónico</label>
              <div class="login-input-group">
                <input type="email" id="reset-correo" placeholder="usuario@correo.com" autocomplete="email">
                <span class="login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
                  </svg>
                </span>
              </div>
            </div>
            <div id="reset-error-1" class="login-error"></div>
            <button type="submit" class="login-submit" id="reset-btn-1">Enviar código</button>
            <button type="button" class="login-forgot" id="btn-back-login">← Volver al inicio de sesión</button>
          </form>
        </div>
      </div>
      <div class="login-right">
        <img src="${fondoLogin}" alt="" class="login-illustration" aria-hidden="true">
      </div>
    </div>
  `
  const form     = content.querySelector('#reset-form-1')
  const btn      = content.querySelector('#reset-btn-1')
  const errorDiv = content.querySelector('#reset-error-1')

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const correo = content.querySelector('#reset-correo').value.trim()
    if (!correo) { errorDiv.textContent = 'Ingresa tu correo.'; return }
    btn.disabled = true; btn.textContent = 'Enviando…'; errorDiv.textContent = ''
    try {
      await solicitarResetPassword(correo)
      showResetStep2(correo)
    } catch (err) {
      errorDiv.textContent = err.message
      btn.disabled = false; btn.textContent = 'Enviar código'
    }
  })
  content.querySelector('#btn-back-login').addEventListener('click', () => showLogin())
}

// ── Reset contraseña — paso 2: ingresar código + nueva contraseña ─────────
function showResetStep2(correo) {
  content.innerHTML = `
    <div class="login-screen">
      <div class="login-left">
        <div class="login-card">
          <div class="login-logo-wrap">
            <img src="${logoAtara}" alt="ATARA" class="login-logo">
          </div>
          <h2 class="login-title">Ingresa el código</h2>
          <p class="login-subtitle">Enviamos un código de 4 dígitos a <strong>${correo}</strong>. Expira en 15 minutos.</p>
          <form class="login-form" id="reset-form-2">
            <div class="login-field">
              <label for="reset-codigo">Código de verificación</label>
              <div class="login-input-group">
                <input type="text" id="reset-codigo" placeholder="0000" maxlength="4"
                  autocomplete="one-time-code"
                  style="font-size:24px;font-weight:700;letter-spacing:10px;text-align:center">
              </div>
            </div>
            <div class="login-field">
              <label for="reset-nueva">Nueva contraseña</label>
              <div class="login-input-group">
                <input type="password" id="reset-nueva" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
                <span class="login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>
                  </svg>
                </span>
              </div>
            </div>
            <div class="login-field">
              <label for="reset-confirmar">Confirmar contraseña</label>
              <div class="login-input-group">
                <input type="password" id="reset-confirmar" placeholder="Repite la contraseña" autocomplete="new-password">
              </div>
            </div>
            <div id="reset-error-2" class="login-error"></div>
            <button type="submit" class="login-submit" id="reset-btn-2">Cambiar contraseña</button>
            <button type="button" class="login-forgot" id="btn-reenviar">¿No llegó el código? Reenviar</button>
          </form>
        </div>
      </div>
      <div class="login-right">
        <img src="${fondoLogin}" alt="" class="login-illustration" aria-hidden="true">
      </div>
    </div>
  `
  const form     = content.querySelector('#reset-form-2')
  const btn      = content.querySelector('#reset-btn-2')
  const errorDiv = content.querySelector('#reset-error-2')

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const codigo    = content.querySelector('#reset-codigo').value.trim()
    const nueva     = content.querySelector('#reset-nueva').value
    const confirmar = content.querySelector('#reset-confirmar').value
    if (codigo.length !== 4)  { errorDiv.textContent = 'El código debe tener 4 dígitos.'; return }
    if (nueva.length < 8)     { errorDiv.textContent = 'La contraseña debe tener al menos 8 caracteres.'; return }
    if (nueva !== confirmar)  { errorDiv.textContent = 'Las contraseñas no coinciden.'; return }
    btn.disabled = true; btn.textContent = 'Cambiando…'; errorDiv.textContent = ''
    try {
      await confirmarResetPassword(correo, codigo, nueva)
      showLogin('Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.')
    } catch (err) {
      errorDiv.textContent = err.message
      btn.disabled = false; btn.textContent = 'Cambiar contraseña'
    }
  })
  content.querySelector('#btn-reenviar').addEventListener('click', async () => {
    try {
      await solicitarResetPassword(correo)
      errorDiv.style.color = 'green'
      errorDiv.textContent = 'Código reenviado. Revisa tu correo.'
      setTimeout(() => { errorDiv.textContent = ''; errorDiv.style.color = '' }, 4000)
    } catch { /* ignorar */ }
  })
}

// ── Cambio de contraseña forzado (primer login) ───────────────────────────
function showCambiarPasswordForzado() {
  document.getElementById('desktop-topbar').style.display = 'none'
  document.body.classList.add('login-mode')

  content.innerHTML = `
    <div class="login-screen">
      <div class="login-left">
        <div class="login-card">
          <div class="login-logo-wrap">
            <img src="${logoAtara}" alt="ATARA" class="login-logo">
          </div>
          <h2 class="login-title">Establece tu contraseña</h2>
          <p class="login-subtitle">Por seguridad, debes crear tu propia contraseña antes de continuar. Usa la contraseña temporal que recibiste por correo.</p>
          <form class="login-form" id="fp-form">
            <div class="login-field">
              <label for="fp-actual">Contraseña temporal</label>
              <div class="login-input-group">
                <input type="password" id="fp-actual" placeholder="Contraseña recibida por correo" autocomplete="current-password">
                <span class="login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>
                  </svg>
                </span>
              </div>
            </div>
            <div class="login-field">
              <label for="fp-nueva">Nueva contraseña</label>
              <div class="login-input-group">
                <input type="password" id="fp-nueva" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
                <span class="login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>
                  </svg>
                </span>
              </div>
            </div>
            <div class="login-field">
              <label for="fp-confirmar">Confirmar contraseña</label>
              <div class="login-input-group">
                <input type="password" id="fp-confirmar" placeholder="Repite la nueva contraseña" autocomplete="new-password">
              </div>
            </div>
            <div id="fp-error" class="login-error"></div>
            <button type="submit" class="login-submit" id="fp-btn">Establecer contraseña</button>
          </form>
        </div>
      </div>
      <div class="login-right">
        <img src="${fondoLogin}" alt="" class="login-illustration" aria-hidden="true">
      </div>
    </div>
  `

  const form     = content.querySelector('#fp-form')
  const btn      = content.querySelector('#fp-btn')
  const errorDiv = content.querySelector('#fp-error')

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const actual    = content.querySelector('#fp-actual').value
    const nueva     = content.querySelector('#fp-nueva').value
    const confirmar = content.querySelector('#fp-confirmar').value
    if (!actual)            { errorDiv.textContent = 'Ingresa la contraseña temporal.'; return }
    if (nueva.length < 8)  { errorDiv.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.'; return }
    if (nueva !== confirmar){ errorDiv.textContent = 'Las contraseñas no coinciden.'; return }
    btn.disabled = true; btn.textContent = 'Guardando…'; errorDiv.textContent = ''
    try {
      await cambiarPassword(actual, nueva)
      await afterLogin()
    } catch (err) {
      errorDiv.textContent = err.message
      btn.disabled = false; btn.textContent = 'Establecer contraseña'
    }
  })
}

// ── Post-login: cargar contexto y mostrar app ────────────────────────────
async function afterLogin() {
  const me = await getContextoUsuario()
  if (!me) return  // session-expired ya disparado por api.js
  _currentUser = me
  document.body.classList.remove('login-mode')
  document.getElementById('desktop-topbar').style.display = ''
  renderNav(me.rol)
  renderFooterLinks(me.rol)
  updateTopbar(me)
  const bsElA = document.querySelector('.backend-status')
  if (bsElA) bsElA.style.display = me.rol === 'ADMIN' ? 'flex' : 'none'
  const hashPage = window.location.hash.slice(1)
  const startPage = (hashPage && pages[hashPage] && canNavigate(hashPage))
    ? hashPage
    : (DEFAULT_PAGE[me.rol] ?? 'aniosLectivos')
  renderBottomNav(me.rol, startPage)
  navigate(startPage)
  window.dispatchEvent(new CustomEvent('atara:logged-in'))
}

// ── Bootstrap: valida token antes de mostrar cualquier contenido ──────────
async function bootstrap() {
  // Ocultar topbar hasta verificar si hay sesión activa
  document.getElementById('desktop-topbar').style.display = 'none'
  if (!getAccessToken()) {
    showLogin()
    return
  }
  // Mostrar indicador de validación mientras se verifica la sesión
  content.innerHTML = '<p class="loading">Verificando sesión…</p>'
  try {
    const me = await getContextoUsuario()
    if (!me) {
      // api.js ya despachó atara:session-expired → lo maneja el listener de abajo
      return
    }
    _currentUser = me
    document.body.classList.remove('login-mode')
    document.getElementById('desktop-topbar').style.display = ''
    renderNav(me.rol)
    updateTopbar(me)
    const bsElB = document.querySelector('.backend-status')
    if (bsElB) bsElB.style.display = me.rol === 'ADMIN' ? 'flex' : 'none'
    const hashPage = window.location.hash.slice(1)
    const startPage = (hashPage && pages[hashPage] && canNavigate(hashPage))
      ? hashPage
      : (DEFAULT_PAGE[me.rol] ?? 'aniosLectivos')
    renderBottomNav(me.rol, startPage)
    navigate(startPage)
  } catch {
    clearAccessToken(); clearRefreshToken(); clearUserId()
    showLogin()
  }
}

// ── Eventos globales ──────────────────────────────────────────────────────
window.addEventListener('popstate', e => {
  if (e.state?.page) navigate(e.state.page, e.state.params || {})
})

window.addEventListener('atara:navigate', e => {
  const { page, params } = e.detail || {}
  if (page) navigate(page, params || {})
  closeSidebar()
})

window.addEventListener('atara:session-expired', () => {
  _currentUser = null
  showLogin('La sesión expiró. Inicia sesión nuevamente.')
})

// ── Topbar: toggle dropdown ───────────────────────────────────────────────
const topbarUser = document.getElementById('topbar-user')
topbarUser?.addEventListener('click', e => {
  topbarUser.classList.toggle('open')
  e.stopPropagation()
})
document.addEventListener('click', () => {
  topbarUser?.classList.remove('open')
})

document.getElementById('topbar-btn-sesion')?.addEventListener('click', () => {
  topbarUser?.classList.remove('open')
  navigate('sesion')
})

document.getElementById('topbar-btn-logout')?.addEventListener('click', async () => {
  topbarUser?.classList.remove('open')
  const btn = document.getElementById('topbar-btn-logout')
  btn.disabled = true
  btn.textContent = 'Cerrando…'
  await logout()
  _currentUser = null
  showToast('Sesión cerrada correctamente.', 'info')
  window.dispatchEvent(new CustomEvent('atara:session-expired'))
})

// ── Sidebar móvil ──────────────────────────────────────────────────────────
const sidebar  = document.querySelector('.sidebar')
const backdrop = document.getElementById('sidebar-backdrop')
const hamburger = document.getElementById('hamburger')

function closeSidebar() {
  sidebar.classList.remove('open')
  backdrop.classList.remove('visible')
  hamburger?.classList.remove('open')
}

hamburger?.addEventListener('click', () => {
  const isOpen = sidebar.classList.toggle('open')
  backdrop.classList.toggle('visible', isOpen)
  hamburger.classList.toggle('open', isOpen)
})
backdrop.addEventListener('click', closeSidebar)

// ── Footer ────────────────────────────────────────────────────────────────
const footerYearEl = document.getElementById('footer-year')
if (footerYearEl) footerYearEl.textContent = new Date().getFullYear()

const FOOTER_LINKS_BY_ROL = {
  ADMIN: [
    { page: 'sesion', label: 'Mi sesión' },
    { page: 'acerca', label: 'Acerca de ATARA' },
  ],
  DOCENTE: [
    { page: 'sesion',            label: 'Mi sesión' },
    { page: 'alertasTempranas',  label: 'Alertas Tempranas' },
    { page: 'evaluacionesSaber', label: 'Eval. por Saber' },
    { page: 'reportes',          label: 'Reportes' },
    { page: 'acerca',            label: 'Acerca de ATARA' },
  ],
}
FOOTER_LINKS_BY_ROL.COORDINADOR = FOOTER_LINKS_BY_ROL.DOCENTE

function renderFooterLinks(rol) {
  const ul = document.getElementById('footer-links')
  if (!ul) return
  const items = FOOTER_LINKS_BY_ROL[rol] || FOOTER_LINKS_BY_ROL.DOCENTE
  ul.innerHTML = items.map(i =>
    `<li><a href="#${i.page}" data-page="${i.page}">${i.label}</a></li>`
  ).join('')
  ul.querySelectorAll('a[data-page]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault()
      navigate(a.dataset.page)
      closeSidebar()
    })
  })
}

// ── Health check ──────────────────────────────────────────────────────────
async function pingBackend() {
  const dot   = document.getElementById('status-dot')
  const label = document.getElementById('status-label')
  try {
    const data = await checkHealth()
    const up = data?.status === 'UP'
    dot.className   = `dot ${up ? 'up' : 'down'}`
    label.textContent = up ? 'En línea' : 'Error de conexión'
  } catch {
    dot.className   = 'dot down'
    label.textContent = 'Sin conexión'
  }
}

pingBackend()
setInterval(pingBackend, 15000)

// ── Arranque ──────────────────────────────────────────────────────────────
bootstrap()
