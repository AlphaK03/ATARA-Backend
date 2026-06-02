package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.auth.ActualizarMateriasRequestDto;
import com.atara.deb.ataraapi.dto.auth.CambiarPasswordRequestDto;
import com.atara.deb.ataraapi.dto.auth.ConfirmarResetRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginResponseDto;
import com.atara.deb.ataraapi.dto.auth.LogoutRequestDto;
import com.atara.deb.ataraapi.dto.auth.MeResponseDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenRequestDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenResponseDto;
import com.atara.deb.ataraapi.dto.auth.RegistroRequestDto;
import com.atara.deb.ataraapi.dto.auth.SolicitarResetRequestDto;
import com.atara.deb.ataraapi.service.AuthService;
import com.atara.deb.ataraapi.service.EmailTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final EmailTokenService emailTokenService;

    public AuthController(AuthService authService, EmailTokenService emailTokenService) {
        this.authService       = authService;
        this.emailTokenService = emailTokenService;
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
     * POST /api/auth/registro
     * Auto-registro de docentes con correo institucional.
     * Solo acepta dominios configurados en app.dominios-permitidos.
     */
    @PostMapping("/registro")
    public ResponseEntity<Void> registro(@Valid @RequestBody RegistroRequestDto request) {
        authService.registro(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * POST /api/auth/password-reset/solicitar
     * Genera y envía un código de 4 dígitos al correo indicado.
     * Responde siempre 200 para no revelar si el correo existe.
     */
    @PostMapping("/password-reset/solicitar")
    public ResponseEntity<Void> solicitarReset(@Valid @RequestBody SolicitarResetRequestDto request) {
        emailTokenService.solicitarResetPassword(request.getCorreo());
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/auth/password-reset/confirmar
     * Valida el código y actualiza la contraseña.
     */
    @PostMapping("/password-reset/confirmar")
    public ResponseEntity<Void> confirmarReset(@Valid @RequestBody ConfirmarResetRequestDto request) {
        emailTokenService.confirmarResetPassword(
                request.getCorreo(), request.getCodigo(), request.getNuevaPassword());
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/auth/email/verificar?token=...
     * Confirma la verificación de correo desde el enlace enviado al usuario.
     */
    @GetMapping("/email/verificar")
    public ResponseEntity<Void> verificarEmail(@RequestParam String token) {
        emailTokenService.confirmarVerificacionEmail(token);
        return ResponseEntity.ok().build();
    }

    /**
     * PUT /api/auth/cambiar-password
     * Cambia la contraseña del usuario autenticado y limpia el flag debeCambiarPassword.
     */
    @PutMapping("/cambiar-password")
    public ResponseEntity<Void> cambiarPassword(
            @Valid @RequestBody CambiarPasswordRequestDto request,
            Authentication authentication) {
        authService.cambiarPassword(authentication, request.getPasswordActual(), request.getNuevaPassword());
        return ResponseEntity.ok().build();
    }

    /**
     * PUT /api/auth/mis-materias
     * Actualiza las materias asignadas al usuario autenticado.
     */
    @PutMapping("/mis-materias")
    public ResponseEntity<Void> actualizarMisMaterias(
            @Valid @RequestBody ActualizarMateriasRequestDto request,
            Authentication authentication) {
        authService.actualizarMisMaterias(authentication, request.getMateriasIds());
        return ResponseEntity.ok().build();
    }
}
