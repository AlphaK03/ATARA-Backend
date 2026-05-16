package com.atara.deb.ataraapi.service;

/**
 * Envía correos transaccionales (verificación de email, código de reset, etc).
 * La implementación cae a "log a consola" si no hay credenciales SMTP
 * configuradas (útil para dev local).
 */
public interface EmailService {

    /** Manda al usuario un link para confirmar que el correo existe. */
    void enviarVerificacionEmail(String destinatario, String nombreUsuario, String linkVerificacion);

    /** Manda un código numérico para restablecer la contraseña. */
    void enviarCodigoResetPassword(String destinatario, String nombreUsuario, String codigo, long minutosValidez);
}
