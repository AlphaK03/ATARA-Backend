import { solicitarResetPassword, confirmarResetPassword } from '../api.js'
import logoAtara from '../assets/images/logos/logo-atara-transparente.png'

/**
 * Flujo de "olvidé mi contraseña" en dos pasos sin requerir login:
 *   PASO 1 — Email: el usuario ingresa su correo y se le manda un código de 6 dígitos.
 *   PASO 2 — Código + nueva contraseña: ingresa lo recibido y la nueva clave.
 *
 * Por seguridad el paso 1 siempre dice "Si el correo existe…" — el backend
 * responde 204 exista o no para evitar enumeración de usuarios.
 */
export function renderRecuperarPassword(container, emailHint) {
  container.innerHTML = `
    <div class="login-screen">
      <div class="login-left">
        <div class="login-card" style="max-width:460px">
          <div class="login-logo-wrap">
            <img src="${logoAtara}" alt="ATARA" class="login-logo">
          </div>
          <h2 class="login-title" id="rec-title">Recuperar contraseña</h2>
          <p style="font-size:13px;color:#6b7280;margin:6px 0 16px;text-align:center" id="rec-subtitle">
            Te enviaremos un código de 6 dígitos a tu correo.
          </p>

          <!-- PASO 1: pedir correo -->
          <form id="rec-form-1" class="login-form" autocomplete="on">
            <div class="login-field">
              <label for="rec-correo">Correo electrónico</label>
              <div class="login-input-group">
                <input type="email" id="rec-correo" placeholder="tucorreo@dominio.com"
                       value="${escHtml(emailHint || '')}" autocomplete="username">
              </div>
            </div>
            <div id="rec-error-1" class="login-error"></div>
            <button type="submit" class="login-submit" id="rec-btn-1">Enviar código</button>
          </form>

          <!-- PASO 2: código + nueva contraseña (oculto al inicio) -->
          <form id="rec-form-2" class="login-form" style="display:none" autocomplete="off">
            <div class="login-field">
              <label for="rec-codigo">Código (6 dígitos)</label>
              <div class="login-input-group">
                <input type="text" id="rec-codigo" inputmode="numeric" pattern="[0-9]{6}"
                       maxlength="6" placeholder="000000" style="letter-spacing:8px;text-align:center;font-size:20px;font-family:monospace">
              </div>
            </div>
            <div class="login-field">
              <label for="rec-nueva">Nueva contraseña</label>
              <div class="login-input-group">
                <input type="password" id="rec-nueva" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
              </div>
            </div>
            <div class="login-field">
              <label for="rec-confirm">Confirmar nueva contraseña</label>
              <div class="login-input-group">
                <input type="password" id="rec-confirm" placeholder="Repite la nueva contraseña" autocomplete="new-password">
              </div>
            </div>
            <div id="rec-error-2" class="login-error"></div>
            <button type="submit" class="login-submit" id="rec-btn-2">Cambiar contraseña</button>
            <button type="button" id="rec-btn-resend" class="login-submit"
              style="background:transparent;color:var(--primary);box-shadow:none;margin-top:8px;font-size:13px">
              No recibí el código — Enviar de nuevo
            </button>
          </form>

          <div style="margin-top:18px;text-align:center;font-size:13px">
            <a href="#" id="rec-volver" style="color:#0369a1;text-decoration:none">← Volver al inicio de sesión</a>
          </div>
        </div>
      </div>
    </div>
  `

  // Refs
  const form1   = container.querySelector('#rec-form-1')
  const form2   = container.querySelector('#rec-form-2')
  const title   = container.querySelector('#rec-title')
  const subt    = container.querySelector('#rec-subtitle')
  const correoI = container.querySelector('#rec-correo')
  const codigoI = container.querySelector('#rec-codigo')
  const nuevaI  = container.querySelector('#rec-nueva')
  const confI   = container.querySelector('#rec-confirm')
  const err1    = container.querySelector('#rec-error-1')
  const err2    = container.querySelector('#rec-error-2')
  const btn1    = container.querySelector('#rec-btn-1')
  const btn2    = container.querySelector('#rec-btn-2')
  const btnResend = container.querySelector('#rec-btn-resend')
  const btnVolver = container.querySelector('#rec-volver')

  let correoConfirmado = ''

  btnVolver.addEventListener('click', e => {
    e.preventDefault()
    window.location.hash = ''
    location.reload()
  })

  // ── PASO 1: pedir código ──────────────────────────────────────────────────
  form1.addEventListener('submit', async ev => {
    ev.preventDefault()
    err1.textContent = ''
    const correo = correoI.value.trim()
    if (!correo) { err1.textContent = 'Ingresa tu correo.'; return }
    btn1.disabled = true
    btn1.textContent = 'Enviando…'
    try {
      await solicitarResetPassword(correo)
      correoConfirmado = correo
      form1.style.display = 'none'
      form2.style.display = ''
      title.textContent = 'Revisa tu correo'
      subt.innerHTML = `Si <strong>${escHtml(correo)}</strong> está registrado, recibirás un código en los próximos minutos. El código expira en 15 minutos.`
      codigoI.focus()
    } catch (e) {
      err1.textContent = e.message
    } finally {
      btn1.disabled = false
      btn1.textContent = 'Enviar código'
    }
  })

  // ── Reenviar código ───────────────────────────────────────────────────────
  btnResend.addEventListener('click', async () => {
    err2.textContent = ''
    btnResend.disabled = true
    btnResend.textContent = 'Reenviando…'
    try {
      await solicitarResetPassword(correoConfirmado)
      err2.style.color = '#16a34a'
      err2.textContent = '✓ Código reenviado a tu correo.'
    } catch (e) {
      err2.style.color = '#dc2626'
      err2.textContent = e.message
    } finally {
      btnResend.disabled = false
      btnResend.textContent = 'No recibí el código — Enviar de nuevo'
    }
  })

  // ── PASO 2: confirmar ─────────────────────────────────────────────────────
  form2.addEventListener('submit', async ev => {
    ev.preventDefault()
    err2.style.color = ''
    err2.textContent = ''
    const codigo = codigoI.value.trim()
    const nueva  = nuevaI.value
    const conf   = confI.value
    if (!/^[0-9]{6}$/.test(codigo)) {
      err2.style.color = '#dc2626'
      err2.textContent = 'El código debe tener 6 dígitos.'
      return
    }
    if (nueva.length < 8) {
      err2.style.color = '#dc2626'
      err2.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.'
      return
    }
    if (nueva !== conf) {
      err2.style.color = '#dc2626'
      err2.textContent = 'Las contraseñas no coinciden.'
      return
    }
    btn2.disabled = true
    btn2.textContent = 'Guardando…'
    try {
      await confirmarResetPassword(correoConfirmado, codigo, nueva)
      form2.style.display = 'none'
      title.textContent = '¡Contraseña restablecida!'
      subt.innerHTML = `<span style="color:#16a34a;font-weight:600">✓ Ya puedes iniciar sesión con tu nueva contraseña.</span>`
    } catch (e) {
      err2.style.color = '#dc2626'
      err2.textContent = e.message
    } finally {
      btn2.disabled = false
      btn2.textContent = 'Cambiar contraseña'
    }
  })
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
