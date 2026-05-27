package com.atara.deb.ataraapi.service;

public interface EmailService {
    void enviarCodigoReset(String destinatario, String nombreUsuario, String codigo);
    void enviarVerificacionEmail(String destinatario, String nombreUsuario, String urlVerificacion);
}
