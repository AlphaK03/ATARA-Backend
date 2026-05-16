package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.auth.LoginRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginResponseDto;
import com.atara.deb.ataraapi.dto.auth.LogoutRequestDto;
import com.atara.deb.ataraapi.dto.auth.MeResponseDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenRequestDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenResponseDto;
import com.atara.deb.ataraapi.exception.TokenRefreshException;
import com.atara.deb.ataraapi.model.TokenRefresh;
import com.atara.deb.ataraapi.model.Usuario;
import com.atara.deb.ataraapi.repository.TokenRefreshRepository;
import com.atara.deb.ataraapi.repository.UsuarioRepository;
import com.atara.deb.ataraapi.security.JwtService;
import com.atara.deb.ataraapi.security.UsuarioPrincipal;
import com.atara.deb.ataraapi.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenRefreshRepository tokenRefreshRepository;
    private final UsuarioRepository usuarioRepository;

    @Value("${jwt.refresh-expiration-days}")
    private long refreshExpirationDays;

    public AuthServiceImpl(AuthenticationManager authenticationManager,
                           JwtService jwtService,
                           TokenRefreshRepository tokenRefreshRepository,
                           UsuarioRepository usuarioRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.tokenRefreshRepository = tokenRefreshRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Autentica al usuario con correo y contraseña.
     * Delega la validación de credenciales a Spring Security (BCrypt + UserDetailsService).
     * Genera access token JWT y refresh token, persiste el refresh token en BD.
     */
    @Override
    public LoginResponseDto login(LoginRequestDto request, HttpServletRequest httpRequest) {
        // Spring Security valida credenciales. Lanza BadCredentialsException o DisabledException si falla.
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getCorreo(), request.getPassword()));

        UsuarioPrincipal principal = (UsuarioPrincipal) auth.getPrincipal();
        Usuario usuario = principal.getUsuario();

        // Actualizar último acceso
        usuario.setUltimoAcceso(OffsetDateTime.now());
        usuarioRepository.save(usuario);

        String accessToken = jwtService.generarToken(usuario);
        String rawRefreshToken = crearYPersistirRefreshToken(usuario, httpRequest);

        LoginResponseDto response = new LoginResponseDto();
        response.setAccessToken(accessToken);
        response.setRefreshToken(rawRefreshToken);
        response.setTokenType("Bearer");
        response.setExpiresIn(jwtService.getExpirationMs() / 1000);
        response.setUserId(usuario.getId());
        response.setCorreo(usuario.getCorreo());
        response.setNombre(usuario.getNombre());
        response.setApellidos(usuario.getApellidos());
        response.setRol(usuario.getRol().getNombre());
        return response;
    }

    /**
     * Valida el refresh token recibido, revoca el token usado (rotación),
     * genera un nuevo access token y un nuevo refresh token.
     */
    @Override
    public RefreshTokenResponseDto refresh(RefreshTokenRequestDto request,
                                           HttpServletRequest httpRequest) {
        String hash = sha256(request.getRefreshToken());

        TokenRefresh tokenGuardado = tokenRefreshRepository.findByTokenHash(hash)
                .orElseThrow(() -> new TokenRefreshException("Refresh token no válido."));

        if (Boolean.TRUE.equals(tokenGuardado.getRevocado())) {
            throw new TokenRefreshException("El refresh token ha sido revocado.");
        }

        if (tokenGuardado.getExpiraEn().isBefore(OffsetDateTime.now())) {
            // Revocar el token expirado para mantener la base limpia
            tokenGuardado.setRevocado(true);
            tokenGuardado.setRevocadoEn(OffsetDateTime.now());
            tokenRefreshRepository.save(tokenGuardado);
            throw new TokenRefreshException("El refresh token ha expirado. Por favor inicia sesión nuevamente.");
        }

        Usuario usuario = tokenGuardado.getUsuario();

        // Revocar el token usado (rotación de refresh token)
        tokenGuardado.setRevocado(true);
        tokenGuardado.setRevocadoEn(OffsetDateTime.now());
        tokenRefreshRepository.save(tokenGuardado);

        String nuevoAccessToken = jwtService.generarToken(usuario);
        String nuevoRawRefreshToken = crearYPersistirRefreshToken(usuario, httpRequest);

        RefreshTokenResponseDto response = new RefreshTokenResponseDto();
        response.setAccessToken(nuevoAccessToken);
        response.setRefreshToken(nuevoRawRefreshToken);
        response.setTokenType("Bearer");
        response.setExpiresIn(jwtService.getExpirationMs() / 1000);
        return response;
    }

    /**
     * Revoca el refresh token recibido, impidiendo futuras renovaciones de sesión.
     */
    @Override
    public void logout(LogoutRequestDto request) {
        String hash = sha256(request.getRefreshToken());

        TokenRefresh token = tokenRefreshRepository.findByTokenHash(hash)
                .orElseThrow(() -> new TokenRefreshException("Refresh token no válido."));

        if (Boolean.FALSE.equals(token.getRevocado())) {
            token.setRevocado(true);
            token.setRevocadoEn(OffsetDateTime.now());
            tokenRefreshRepository.save(token);
        }
    }

    /**
     * Devuelve los datos del usuario actualmente autenticado, extraídos del SecurityContext.
     * Para docentes incluye las secciones y materias asignadas.
     */
    @Override
    @Transactional(readOnly = true)
    public MeResponseDto me(Authentication authentication) {
        UsuarioPrincipal principal = (UsuarioPrincipal) authentication.getPrincipal();
        Usuario usuario = principal.getUsuario();

        MeResponseDto response = new MeResponseDto();
        response.setUserId(usuario.getId());
        response.setCorreo(usuario.getCorreo());
        response.setNombre(usuario.getNombre());
        response.setApellidos(usuario.getApellidos());
        response.setRol(usuario.getRol().getNombre());
        response.setSeccionIds(usuarioRepository.findSeccionIdsByUsuarioId(usuario.getId()));
        response.setMateriaIds(usuarioRepository.findMateriaIdsByUsuarioId(usuario.getId()));
        response.setCentroIds(usuarioRepository.findCentroIdsByUsuarioId(usuario.getId()));
        return response;
    }

    // -------------------------------------------------------------------------

    private String crearYPersistirRefreshToken(Usuario usuario, HttpServletRequest request) {
        String rawToken = UUID.randomUUID().toString();
        String hash = sha256(rawToken);

        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null && userAgent.length() > 255) {
            userAgent = userAgent.substring(0, 255);
        }

        TokenRefresh tokenRefresh = TokenRefresh.builder()
                .usuario(usuario)
                .tokenHash(hash)
                .expiraEn(OffsetDateTime.now().plusDays(refreshExpirationDays))
                .revocado(false)
                .ipOrigen(obtenerIp(request))
                .userAgent(userAgent)
                .build();

        tokenRefreshRepository.save(tokenRefresh);
        return rawToken;
    }

    private String obtenerIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Calcula el hash SHA-256 del token en texto plano.
     * La BD guarda siempre el hash, nunca el token original.
     */
    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) hex.append('0');
                hex.append(h);
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 no disponible en este entorno", e);
        }
    }
}
