package com.atara.deb.ataraapi.service;

public interface EmailTokenService {
    void solicitarResetPassword(String correo);
    void confirmarResetPassword(String correo, String codigo, String nuevaPassword);
    void enviarVerificacionNuevoUsuario(Long usuarioId);
    void confirmarVerificacionEmail(String token);
}
