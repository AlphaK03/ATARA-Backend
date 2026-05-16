package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.auth.CambiarPasswordRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginResponseDto;
import com.atara.deb.ataraapi.dto.auth.LogoutRequestDto;
import com.atara.deb.ataraapi.dto.auth.MeResponseDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenRequestDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;

public interface AuthService {

    LoginResponseDto login(LoginRequestDto request, HttpServletRequest httpRequest);

    RefreshTokenResponseDto refresh(RefreshTokenRequestDto request, HttpServletRequest httpRequest);

    void logout(LogoutRequestDto request);

    MeResponseDto me(Authentication authentication);

    void cambiarPassword(Authentication authentication, CambiarPasswordRequestDto request);

    /** Confirma un token de verificación recibido por correo. */
    void verificarEmail(String token);

    /** Reenvía el correo de verificación al usuario autenticado. */
    void reenviarVerificacionEmail(Authentication authentication);

    /**
     * Emite un código de reset al correo indicado. Por seguridad se comporta
     * idempotentemente: no informa si el correo existe o no.
     */
    void solicitarResetPassword(com.atara.deb.ataraapi.dto.auth.SolicitarResetRequestDto request);

    /** Valida el código y establece la nueva contraseña. */
    void confirmarResetPassword(com.atara.deb.ataraapi.dto.auth.ConfirmarResetRequestDto request);
}
