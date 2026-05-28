package com.atara.deb.ataraapi.service;

public interface EmailService {
    void enviarCodigoReset(String destinatario, String nombreUsuario, String codigo);
    void enviarVerificacionEmail(String destinatario, String nombreUsuario, String urlVerificacion);
    void enviarBienvenida(String destinatario, String nombreUsuario, String passwordTemporal);

    /** Envío síncrono de prueba — lanza excepción si el SMTP falla. Solo para diagnóstico. */
    void enviarPrueba(String destinatario);
}
