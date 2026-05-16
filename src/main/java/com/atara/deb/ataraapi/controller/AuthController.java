package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.auth.CambiarPasswordRequestDto;
import com.atara.deb.ataraapi.dto.auth.ConfirmarResetRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginResponseDto;
import com.atara.deb.ataraapi.dto.auth.LogoutRequestDto;
import com.atara.deb.ataraapi.dto.auth.MeResponseDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenRequestDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenResponseDto;
import com.atara.deb.ataraapi.dto.auth.SolicitarResetRequestDto;
import com.atara.deb.ataraapi.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/login
     * Autentica al usuario con correo y contraseña.
     * Devuelve access token JWT, refresh token y datos básicos del usuario.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(
            @Valid @RequestBody LoginRequestDto request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest));
    }

    /**
     * POST /api/auth/refresh
     * Renueva el access token usando un refresh token válido.
     * El refresh token usado se revoca y se emite uno nuevo (rotación).
     */
    @PostMapping("/refresh")
    public ResponseEntity<RefreshTokenResponseDto> refresh(
            @Valid @RequestBody RefreshTokenRequestDto request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.refresh(request, httpRequest));
    }

    /**
     * POST /api/auth/logout
     * Revoca el refresh token, invalidando la sesión del usuario.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequestDto request) {
        authService.logout(request);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/auth/me
     * Devuelve los datos del usuario autenticado según el access token Bearer.
     * Útil para que el frontend recupere la sesión actual.
     */
    @GetMapping("/me")
    public ResponseEntity<MeResponseDto> me(Authentication authentication) {
        return ResponseEntity.ok(authService.me(authentication));
    }

    /**
     * POST /api/auth/cambiar-password
     * Permite al usuario autenticado cambiar su propia contraseña proporcionando
     * la contraseña actual y la nueva. No se acepta id en el body — el usuario
     * afectado es siempre el del JWT.
     */
    @PostMapping("/cambiar-password")
    public ResponseEntity<Void> cambiarPassword(
            Authentication authentication,
            @Valid @RequestBody CambiarPasswordRequestDto request) {
        authService.cambiarPassword(authentication, request);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/auth/verificar-email?token=...
     * Endpoint público: confirma el correo del usuario al hacer click en el
     * link que recibió por correo. No requiere autenticación porque el token
     * mismo es la prueba.
     */
    @PostMapping("/verificar-email")
    public ResponseEntity<Void> verificarEmail(@RequestParam("token") String token) {
        authService.verificarEmail(token);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/auth/reenviar-verificacion
     * Para usuarios autenticados cuyo correo aún no está verificado. Genera
     * un nuevo token (invalida los anteriores) y manda el correo de nuevo.
     */
    @PostMapping("/reenviar-verificacion")
    public ResponseEntity<Void> reenviarVerificacion(Authentication authentication) {
        authService.reenviarVerificacionEmail(authentication);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/auth/reset-password/solicitar
     * Público. Genera un código de 6 dígitos y lo manda al correo si existe.
     * Devuelve 204 siempre, exista o no el correo (anti-enumeración).
     */
    @PostMapping("/reset-password/solicitar")
    public ResponseEntity<Void> solicitarReset(@Valid @RequestBody SolicitarResetRequestDto request) {
        authService.solicitarResetPassword(request);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/auth/reset-password/confirmar
     * Público. Valida correo + código y establece la nueva contraseña.
     */
    @PostMapping("/reset-password/confirmar")
    public ResponseEntity<Void> confirmarReset(@Valid @RequestBody ConfirmarResetRequestDto request) {
        authService.confirmarResetPassword(request);
        return ResponseEntity.noContent().build();
    }
}
