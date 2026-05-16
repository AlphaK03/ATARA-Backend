package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * Envía correos por SMTP usando {@link JavaMailSender}. Si {@code spring.mail.username}
 * viene vacío, no intenta enviar nada: imprime el cuerpo en logs con nivel WARN
 * para que en dev local (sin SMTP) los flujos sigan funcionales y el desarrollador
 * pueda copiar el link/código directo de la terminal.
 */
@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${app.mail.from-name}")
    private String fromName;

    @Value("${app.mail.from-address}")
    private String fromAddress;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void enviarVerificacionEmail(String destinatario, String nombreUsuario, String linkVerificacion) {
        String asunto = "Confirma tu correo en ATARA";
        String html = """
            <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:540px;margin:auto;padding:24px;color:#1f2937">
              <h2 style="color:#0369a1;margin:0 0 16px">Bienvenido(a) a ATARA</h2>
              <p>Hola %s,</p>
              <p>Un administrador creó una cuenta para ti en el Sistema de Alerta Temprana y Atención al Rendimiento Académico.</p>
              <p>Confirma que este correo te pertenece haciendo click en el siguiente botón:</p>
              <p style="text-align:center;margin:28px 0">
                <a href="%s" style="background:#0369a1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block">
                  Verificar mi correo
                </a>
              </p>
              <p style="font-size:13px;color:#6b7280">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="%s" style="color:#0369a1;word-break:break-all">%s</a>
              </p>
              <p style="font-size:12px;color:#9ca3af;margin-top:32px">
                El enlace expira en 24 horas. Si tú no esperabas este correo, puedes ignorarlo.
              </p>
            </div>
            """.formatted(escapeHtml(nombreUsuario), linkVerificacion, linkVerificacion, linkVerificacion);

        enviar(destinatario, asunto, html, "verificación de email");
    }

    @Override
    public void enviarCodigoResetPassword(String destinatario, String nombreUsuario, String codigo, long minutosValidez) {
        String asunto = "Código para restablecer tu contraseña — ATARA";
        String html = """
            <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:540px;margin:auto;padding:24px;color:#1f2937">
              <h2 style="color:#0369a1;margin:0 0 16px">Restablecer contraseña</h2>
              <p>Hola %s,</p>
              <p>Solicitaste restablecer tu contraseña en ATARA. Usa el siguiente código en la pantalla de recuperación:</p>
              <p style="text-align:center;margin:28px 0">
                <span style="display:inline-block;background:#eff6ff;border:2px dashed #0369a1;color:#0369a1;
                             font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:32px;font-weight:700;
                             letter-spacing:8px;padding:18px 32px;border-radius:10px">%s</span>
              </p>
              <p style="font-size:13px;color:#6b7280">
                El código vence en <strong>%d minutos</strong> y solo puede usarse una vez.
              </p>
              <p style="font-size:12px;color:#9ca3af;margin-top:32px">
                Si tú no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual seguirá funcionando.
              </p>
            </div>
            """.formatted(escapeHtml(nombreUsuario), codigo, minutosValidez);

        enviar(destinatario, asunto, html, "código de reset de contraseña");
    }

    private void enviar(String destinatario, String asunto, String cuerpoHtml, String contextoLog) {
        if (smtpUsername == null || smtpUsername.isBlank()) {
            // Modo dev sin SMTP: no fallar, solo loguear para que el dev copie el contenido.
            log.warn("[email-stub] SMTP no configurado. Correo NO enviado a {} ({}).\nContenido:\n{}",
                    destinatario, contextoLog, cuerpoHtml);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(fromAddress, fromName, StandardCharsets.UTF_8.name()));
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(cuerpoHtml, true);
            mailSender.send(msg);
            log.info("Correo enviado a {} ({})", destinatario, contextoLog);
        } catch (MessagingException | UnsupportedEncodingException e) {
            // No bloquea el flujo de negocio (el usuario ya quedó creado, p.ej.). Solo loguea.
            log.error("Error enviando correo a {} ({}): {}", destinatario, contextoLog, e.getMessage(), e);
        }
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
