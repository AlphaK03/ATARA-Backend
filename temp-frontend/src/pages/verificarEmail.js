import { verificarEmail } from '../api.js'
import logoAtara from '../assets/images/logos/logo-atara-transparente.png'

/**
 * Página standalone para el flujo de verificación de correo. Se accede vía
 * el link enviado por correo: `#verificar?token=xxx`. No requiere login.
 *
 * Comportamiento:
 *   - Sin token → muestra mensaje de error con botón a login.
 *   - Token válido → success y botón "Ir a iniciar sesión".
 *   - Token inválido / expirado / usado → muestra el mensaje del backend.
 */
export async function renderVerificarEmail(container, token) {
  container.innerHTML = `
    <div class="login-screen">
      <div class="login-left">
        <div class="login-card" style="max-width:440px">
          <div class="login-logo-wrap">
            <img src="${logoAtara}" alt="ATARA" class="login-logo">
          </div>
          <h2 class="login-title">Verificando tu correo…</h2>
          <div id="verif-body" style="margin-top:16px;font-size:14px;color:#374151;text-align:center;min-height:80px">
            <p class="loading">Procesando…</p>
          </div>
          <div style="margin-top:20px;text-align:center">
            <a href="#" id="verif-ir-login" class="login-submit" style="display:inline-block;width:auto;padding:12px 28px;text-decoration:none">
              Ir a iniciar sesión
            </a>
          </div>
        </div>
      </div>
    </div>
  `

  const body = container.querySelector('#verif-body')
  const ir   = container.querySelector('#verif-ir-login')

  ir.addEventListener('click', e => {
    e.preventDefault()
    window.location.hash = ''
    location.reload()
  })

  if (!token) {
    body.innerHTML = `
      <div style="color:#dc2626;font-weight:600;margin-bottom:8px">Enlace inválido</div>
      <div style="color:#6b7280;font-size:13px">El enlace de verificación no incluye un token.</div>
    `
    container.querySelector('.login-title').textContent = 'No se pudo verificar'
    return
  }

  try {
    await verificarEmail(token)
    container.querySelector('.login-title').textContent = '¡Correo verificado!'
    body.innerHTML = `
      <div style="color:#16a34a;font-weight:600;font-size:16px;margin-bottom:8px">✓ Tu correo fue confirmado.</div>
      <div style="color:#6b7280;font-size:13px">Ya puedes iniciar sesión normalmente.</div>
    `
  } catch (e) {
    container.querySelector('.login-title').textContent = 'No se pudo verificar'
    body.innerHTML = `
      <div style="color:#dc2626;font-weight:600;margin-bottom:8px">${escHtml(e.message)}</div>
      <div style="color:#6b7280;font-size:13px">
        Si necesitas un nuevo enlace, inicia sesión y pídelo desde Mi sesión.
      </div>
    `
  }
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
