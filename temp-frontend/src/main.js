import './style.css'
import logoAtara  from './assets/images/logos/logo-atara-transparente.png'
import fondoLogin from './assets/images/backgrounds/fondo login.svg'
import { checkHealth, getAccessToken, getContextoUsuario, login, logout,
         clearAccessToken, clearRefreshToken, clearUserId } from './api.js'
import { renderAniosLectivos }    from './pages/aniosLectivos.js'
import { renderEstudiantes }      from './pages/estudiantes.js'
import { renderMatriculas }       from './pages/matriculas.js'
import { renderEvaluaciones }     from './pages/evaluaciones.js'
import { renderAlertas }          from './pages/alertas.js'
import { renderAlertasTempranas } from './pages/alertasTempranas.js'
import { renderEvaluacionesSaber } from './pages/evaluacionesSaber.js'
import { renderVisualizaciones }  from './pages/visualizaciones.js'
import { renderReportes }         from './pages/reportes.js'
import { renderImportarPiad }     from './pages/importarPiad.js'
import { renderSecciones }        from './pages/secciones.js'
import { renderSesion }           from './pages/sesion.js'
import { renderAdmin }            from './pages/admin.js'

const pages = {
  aniosLectivos:    renderAniosLectivos,
  estudiantes:      renderEstudiantes,
  importarPiad:     renderImportarPiad,
  secciones:        renderSecciones,
  matriculas:       renderMatriculas,
  evaluaciones:     renderEvaluaciones,
  alertas:          renderAlertas,
  alertasTempranas: renderAlertasTempranas,
  evaluacionesSaber: renderEvaluacionesSaber,
  visualizaciones:  renderVisualizaciones,
  reportes:         renderReportes,
  sesion:           renderSesion,
  admin:            renderAdmin,
}

// ── Definición de menú por rol ────────────────────────────────────────────
const NAV_BY_ROL = {
  ADMIN: [
    { section: 'Administración', items: [
      { page: 'admin', label: 'Gestión de usuarios' },
    ]},
    { section: 'Gestión', items: [
      { page: 'aniosLectivos', label: 'Años Lectivos' },
      { page: 'estudiantes',   label: 'Estudiantes' },
      { page: 'importarPiad',  label: 'Importar PIAD' },
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
  ],
}
NAV_BY_ROL.COORDINADOR = NAV_BY_ROL.DOCENTE

// Páginas a las que solo puede acceder ADMIN
const ADMIN_ONLY_PAGES = new Set(['admin', 'aniosLectivos', 'estudiantes', 'importarPiad'])

const DEFAULT_PAGE = { ADMIN: 'admin', DOCENTE: 'secciones', COORDINADOR: 'secciones' }

// ── Estado global ─────────────────────────────────────────────────────────
let _currentUser = null  // { userId, nombre, apellidos, rol, ... }

const content  = document.getElementById('page-content')
const navLinks = document.getElementById('nav-links')

// Logo del sidebar (importado desde assets, Vite lo resuelve con hash)
const sidebarLogoEl = document.getElementById('sidebar-logo')
if (sidebarLogoEl) sidebarLogoEl.src = logoAtara

// ── Render del menú según rol ─────────────────────────────────────────────
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
  navLinks.querySelectorAll('a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page)
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
                <input type="email" id="login-correo" placeholder="usuario@correo.com" value="admin@atara.mep.go.cr" autocomplete="username">
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
                <input type="password" id="login-pass" placeholder="Ingrese su contraseña" value="Admin1234!" autocomplete="current-password">
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
      await login(correo, pass)
      // login limpia _meCache en api.js; bootstrap lo recargará
      await afterLogin()
    } catch (e) {
      errorDiv.textContent = e.message
      btn.disabled = false
      btn.textContent = 'Ingresar'
    }
  }

  form.addEventListener('submit', doLogin)
}

// ── Post-login: cargar contexto y mostrar app ────────────────────────────
async function afterLogin() {
  const me = await getContextoUsuario()
  if (!me) return  // session-expired ya disparado por api.js
  _currentUser = me
  document.body.classList.remove('login-mode')
  document.getElementById('desktop-topbar').style.display = ''
  renderNav(me.rol)
  updateTopbar(me)
  const defaultPage = DEFAULT_PAGE[me.rol] ?? 'aniosLectivos'
  navigate(defaultPage)
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
    navigate(DEFAULT_PAGE[me.rol] ?? 'aniosLectivos')
  } catch {
    clearAccessToken(); clearRefreshToken(); clearUserId()
    showLogin()
  }
}

// ── Eventos globales ──────────────────────────────────────────────────────
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

// ── Health check ──────────────────────────────────────────────────────────
async function pingBackend() {
  const dot   = document.getElementById('status-dot')
  const label = document.getElementById('status-label')
  try {
    const data = await checkHealth()
    const up = data?.status === 'UP'
    dot.className   = `dot ${up ? 'up' : 'down'}`
    label.textContent = up ? 'Backend UP' : 'Backend DOWN'
  } catch {
    dot.className   = 'dot down'
    label.textContent = 'Sin conexión'
  }
}

pingBackend()
setInterval(pingBackend, 15000)

// ── Arranque ──────────────────────────────────────────────────────────────
bootstrap()
