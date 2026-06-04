package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final RestClient restClient;

    @Value("${brevo.api-key}")
    private String apiKey;

    @Value("${brevo.from-email}")
    private String fromEmail;

    @Value("${brevo.from-name}")
    private String fromName;

    public EmailServiceImpl(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @Override
    public void enviarCodigoReset(String destinatario, String nombreUsuario, String codigo) {
        enviar(destinatario, "ATARA — Código para restablecer tu contraseña",
                htmlReset(nombreUsuario, codigo));
    }

    @Override
    public void enviarBienvenida(String destinatario, String nombreUsuario, String passwordTemporal) {
        enviar(destinatario, "ATARA — Tu cuenta ha sido creada",
                htmlBienvenida(nombreUsuario, destinatario, passwordTemporal));
    }

    @Override
    public void enviarVerificacionEmail(String destinatario, String nombreUsuario, String urlVerificacion) {
        enviar(destinatario, "ATARA — Verifica tu correo electrónico",
                htmlVerificacion(nombreUsuario, urlVerificacion));
    }

    @Override
    public void enviarPrueba(String destinatario) {
        // Síncrono y sin captura: lanza excepción si Brevo falla — solo para diagnóstico.
        restClient.post()
                .uri(BREVO_URL)
                .header("api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(buildPayload(destinatario, "ATARA — Prueba de conexión",
                        "<p>Correo de prueba enviado correctamente desde ATARA via Brevo.</p>"))
                .retrieve()
                .toBodilessEntity();
    }

    // ── Envío interno ─────────────────────────────────────────────────────────

    private void enviar(String destinatario, String asunto, String html) {
        try {
            restClient.post()
                    .uri(BREVO_URL)
                    .header("api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(buildPayload(destinatario, asunto, html))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Error al enviar correo via Brevo (asunto='{}'): {}", asunto, e.getMessage());
        }
    }

    private Map<String, Object> buildPayload(String destinatario, String asunto, String html) {
        return Map.of(
                "sender",      Map.of("name", fromName, "email", fromEmail),
                "to",          List.of(Map.of("email", destinatario)),
                "subject",     asunto,
                "htmlContent", html
        );
    }

    // ── Plantillas HTML ───────────────────────────────────────────────────────

    private String htmlBienvenida(String nombre, String correo, String password) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
                    <tr>
                      <td style="background:#990000;padding:24px 32px">
                        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px">ATARA</p>
                        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7)">Sistema de Alerta Temprana y Atención al Rendimiento Académico</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px">
                        <p style="margin:0 0 12px;font-size:15px;color:#111827">Hola, <strong>%s</strong></p>
                        <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6">
                          Tu cuenta en ATARA ha sido creada. A continuación encontrarás tus credenciales de acceso temporales:
                        </p>
                        <table style="width:100%%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:20px">
                          <tr>
                            <td style="font-size:13px;color:#6b7280;padding:4px 0">Correo:</td>
                            <td style="font-size:13px;font-weight:600;color:#111827;padding:4px 0">%s</td>
                          </tr>
                          <tr>
                            <td style="font-size:13px;color:#6b7280;padding:4px 0">Contraseña temporal:</td>
                            <td style="font-size:15px;font-weight:700;color:#990000;letter-spacing:2px;padding:4px 0">%s</td>
                          </tr>
                        </table>
                        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:12px 16px;margin-bottom:20px">
                          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6">
                            <strong>⚠ Importante:</strong> Al iniciar sesión por primera vez se te pedirá que establezcas una nueva contraseña. Esta contraseña temporal no podrá usarse después.
                          </p>
                        </div>
                        <p style="margin:0;font-size:13px;color:#6b7280">
                          Si tienes dudas, comunícate con el administrador del sistema.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px">
                        <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
                          CIDE — División de Educación Básica, Universidad Nacional de Costa Rica<br>
                          Este es un mensaje automático, no respondas a este correo.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(nombre, correo, password);
    }

    private String htmlReset(String nombre, String codigo) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
                    <tr>
                      <td style="background:#990000;padding:24px 32px">
                        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px">ATARA</p>
                        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7)">Sistema de Alerta Temprana y Atención al Rendimiento Académico</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px">
                        <p style="margin:0 0 12px;font-size:15px;color:#111827">Hola, <strong>%s</strong></p>
                        <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
                          Recibimos una solicitud para restablecer la contraseña de tu cuenta en ATARA.
                          Ingresa el siguiente código en la pantalla de restablecimiento:
                        </p>
                        <div style="text-align:center;margin:0 0 24px">
                          <span style="display:inline-block;background:#fff0f0;border:2px solid #990000;border-radius:8px;padding:16px 40px;font-size:36px;font-weight:700;letter-spacing:12px;color:#990000">%s</span>
                        </div>
                        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6">
                          Este código expira en <strong>15 minutos</strong> y solo puede usarse una vez.
                          Si no solicitaste este cambio, ignora este mensaje — tu contraseña no cambiará.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px">
                        <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
                          CIDE — División de Educación Básica, Universidad Nacional de Costa Rica<br>
                          Este es un mensaje automático, no respondas a este correo.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(nombre, codigo);
    }

    private String htmlVerificacion(String nombre, String urlVerificacion) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
                    <tr>
                      <td style="background:#990000;padding:24px 32px">
                        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px">ATARA</p>
                        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7)">Sistema de Alerta Temprana y Atención al Rendimiento Académico</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px">
                        <p style="margin:0 0 12px;font-size:15px;color:#111827">Hola, <strong>%s</strong></p>
                        <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
                          Bienvenido/a a ATARA. Para activar tu cuenta, confirma tu dirección de correo electrónico presionando el botón:
                        </p>
                        <div style="text-align:center;margin:0 0 24px">
                          <a href="%s" style="display:inline-block;background:#990000;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:6px">
                            Verificar mi correo
                          </a>
                        </div>
                        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6">
                          El enlace expira en <strong>24 horas</strong>. Si no creaste esta cuenta, ignora este mensaje.
                        </p>
                        <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;word-break:break-all">
                          O copia este enlace en tu navegador: %s
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px">
                        <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
                          CIDE — División de Educación Básica, Universidad Nacional de Costa Rica<br>
                          Este es un mensaje automático, no respondas a este correo.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(nombre, urlVerificacion, urlVerificacion);
    }
}
