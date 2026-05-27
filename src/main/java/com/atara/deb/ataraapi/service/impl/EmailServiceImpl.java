package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String remitente;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    @Override
    public void enviarCodigoReset(String destinatario, String nombreUsuario, String codigo) {
        String asunto = "ATARA — Código para restablecer tu contraseña";
        String html = htmlReset(nombreUsuario, codigo);
        enviar(destinatario, asunto, html);
    }

    @Async
    @Override
    public void enviarVerificacionEmail(String destinatario, String nombreUsuario, String urlVerificacion) {
        String asunto = "ATARA — Verifica tu correo electrónico";
        String html = htmlVerificacion(nombreUsuario, urlVerificacion);
        enviar(destinatario, asunto, html);
    }

    private void enviar(String destinatario, String asunto, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(remitente, "ATARA — Notificaciones");
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            // Log sin lanzar excepción: el flujo no debe romperse si el correo falla
            System.err.println("[EmailService] Error al enviar correo a " + destinatario + ": " + e.getMessage());
        }
    }

    // ── Plantillas HTML ───────────────────────────────────────────────────────

    private String htmlReset(String nombre, String codigo) {
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
                <tr><td align="center">
                  <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
                    <!-- Header -->
                    <tr>
                      <td style="background:#990000;padding:24px 32px">
                        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px">ATARA</p>
                        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7)">Sistema de Alerta Temprana y Atención al Rendimiento Académico</p>
                      </td>
                    </tr>
                    <!-- Body -->
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
                    <!-- Footer -->
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
                    <!-- Header -->
                    <tr>
                      <td style="background:#990000;padding:24px 32px">
                        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px">ATARA</p>
                        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7)">Sistema de Alerta Temprana y Atención al Rendimiento Académico</p>
                      </td>
                    </tr>
                    <!-- Body -->
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
                    <!-- Footer -->
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
