package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.model.Usuario;

public interface EmailTokenService {

    /**
     * Genera un token de verificación de email para el usuario y manda el correo.
     * Invalida tokens previos del mismo tipo. Devuelve el link completo
     * (incluye base URL del frontend) por si el caller quiere loguearlo.
     */
    String emitirYEnviarVerificacionEmail(Usuario usuario);

    /**
     * Genera un código de reset (6 dígitos) y lo manda al correo. Invalida
     * códigos previos pendientes para el mismo usuario.
     */
    void emitirYEnviarCodigoReset(Usuario usuario);

    /**
     * Confirma un token de verificación. Marca el usuario como verificado
     * y el token como usado. Lanza {@code IllegalArgumentException} si el
     * token no existe, está usado o expiró.
     */
    void verificarEmail(String rawToken);

    /**
     * Valida el código de reset y establece la nueva contraseña. Lanza
     * {@code IllegalArgumentException} si el correo no existe, el código no
     * coincide, está usado o expiró. La contraseña se hashea con BCrypt.
     */
    void consumirCodigoReset(String correo, String codigo, String nuevaPassword);
}
