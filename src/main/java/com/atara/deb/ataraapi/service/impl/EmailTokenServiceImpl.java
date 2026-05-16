package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.model.EmailToken;
import com.atara.deb.ataraapi.model.Usuario;
import com.atara.deb.ataraapi.model.enums.TipoEmailToken;
import com.atara.deb.ataraapi.repository.EmailTokenRepository;
import com.atara.deb.ataraapi.repository.UsuarioRepository;
import com.atara.deb.ataraapi.service.EmailService;
import com.atara.deb.ataraapi.service.EmailTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@Transactional
public class EmailTokenServiceImpl implements EmailTokenService {

    private static final SecureRandom RNG = new SecureRandom();

    /**
     * Máximo de intentos fallidos por código de reset antes de invalidarlo.
     * Con códigos de 4 dígitos (10.000 combinaciones), 5 intentos = 0.05%
     * de probabilidad de acertar adivinando, comparable a un código de 6
     * dígitos sin contador.
     */
    private static final int MAX_INTENTOS_RESET = 5;

    private final EmailTokenRepository emailTokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.tokens.verificacion-horas}")
    private long verificacionHoras;

    @Value("${app.tokens.reset-minutos}")
    private long resetMinutos;

    public EmailTokenServiceImpl(EmailTokenRepository emailTokenRepository,
                                 UsuarioRepository usuarioRepository,
                                 EmailService emailService,
                                 PasswordEncoder passwordEncoder) {
        this.emailTokenRepository = emailTokenRepository;
        this.usuarioRepository    = usuarioRepository;
        this.emailService         = emailService;
        this.passwordEncoder      = passwordEncoder;
    }

    // ── Verificación de email ─────────────────────────────────────────────────

    @Override
    public String emitirYEnviarVerificacionEmail(Usuario usuario) {
        emailTokenRepository.invalidarPendientes(usuario.getId(), TipoEmailToken.VERIFICACION_EMAIL);

        String rawToken = UUID.randomUUID().toString();
        EmailToken token = EmailToken.builder()
                .usuario(usuario)
                .tipo(TipoEmailToken.VERIFICACION_EMAIL)
                .tokenHash(sha256(rawToken))
                .expiraEn(OffsetDateTime.now().plusHours(verificacionHoras))
                .build();
        emailTokenRepository.save(token);

        String link = construirLinkVerificacion(rawToken);
        emailService.enviarVerificacionEmail(
                usuario.getCorreo(),
                usuario.getNombre(),
                link);
        return link;
    }

    @Override
    public void verificarEmail(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Token de verificación inválido.");
        }
        EmailToken token = emailTokenRepository.findByTokenHash(sha256(rawToken))
                .filter(t -> t.getTipo() == TipoEmailToken.VERIFICACION_EMAIL)
                .orElseThrow(() -> new IllegalArgumentException(
                        "El enlace de verificación no es válido."));

        validarTokenVigente(token, "Este enlace de verificación ya fue usado.",
                "El enlace de verificación expiró. Solicita uno nuevo.");

        Usuario u = token.getUsuario();
        u.setEmailVerificado(true);
        usuarioRepository.save(u);

        token.setUsadoEn(OffsetDateTime.now());
        emailTokenRepository.save(token);
    }

    // ── Reset de contraseña ───────────────────────────────────────────────────

    @Override
    public void emitirYEnviarCodigoReset(Usuario usuario) {
        emailTokenRepository.invalidarPendientes(usuario.getId(), TipoEmailToken.RESET_PASSWORD);

        String codigo = generarCodigo4Digitos();
        EmailToken token = EmailToken.builder()
                .usuario(usuario)
                .tipo(TipoEmailToken.RESET_PASSWORD)
                .tokenHash(sha256(codigo))
                .expiraEn(OffsetDateTime.now().plusMinutes(resetMinutos))
                .build();
        emailTokenRepository.save(token);

        emailService.enviarCodigoResetPassword(
                usuario.getCorreo(),
                usuario.getNombre(),
                codigo,
                resetMinutos);
    }

    @Override
    public void consumirCodigoReset(String correo, String codigo, String nuevaPassword) {
        if (correo == null || correo.isBlank() || codigo == null || codigo.isBlank()
                || nuevaPassword == null || nuevaPassword.length() < 8) {
            throw new IllegalArgumentException("Datos inválidos para restablecer la contraseña.");
        }
        Usuario usuario = usuarioRepository.findByCorreo(correo.trim().toLowerCase())
                .orElse(null);

        // Si el correo no existe, devolvemos el mismo mensaje genérico que cuando
        // el código es incorrecto — así un atacante no puede usar este endpoint
        // para descubrir si un correo está registrado.
        if (usuario == null) {
            throw new IllegalArgumentException("El código no es válido o ya expiró.");
        }

        // Buscamos el código por su hash. Si el atacante adivina un código que
        // pertenece a OTRO usuario, el filtro por usuario.id hace que falle igual.
        EmailToken token = emailTokenRepository.findByTokenHash(sha256(codigo.trim()))
                .filter(t -> t.getTipo() == TipoEmailToken.RESET_PASSWORD)
                .filter(t -> t.getUsuario().getId().equals(usuario.getId()))
                .orElse(null);

        if (token == null) {
            // Código incorrecto: registramos el intento en el token activo más reciente
            // del usuario para que cuente contra el límite. Así un atacante no puede
            // hacer brute-force ilimitado solo porque cada intento "no encuentra el token".
            registrarIntentoFallidoEnTokenActivo(usuario);
            throw new IllegalArgumentException("El código no es válido o ya expiró.");
        }

        validarTokenVigente(token,
                "El código ya fue utilizado. Solicita uno nuevo.",
                "El código expiró. Solicita uno nuevo.");

        // Código correcto → reset y marcar usado
        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);

        token.setUsadoEn(OffsetDateTime.now());
        emailTokenRepository.save(token);
    }

    /**
     * Cuando alguien envía un código que no matchea ningún token, igual queremos
     * que cuente como intento fallido contra el código activo del usuario (si
     * tiene uno). De lo contrario el contador de intentos sería trivial de
     * evadir: probar 10.000 códigos al azar y solo los aciertos consumirían
     * intentos. Así cada POST cuenta.
     */
    private void registrarIntentoFallidoEnTokenActivo(Usuario usuario) {
        emailTokenRepository
                .findFirstByUsuarioIdAndTipoAndUsadoEnIsNullAndExpiraEnAfterOrderByIdDesc(
                        usuario.getId(), TipoEmailToken.RESET_PASSWORD, OffsetDateTime.now())
                .ifPresent(activo -> {
                    activo.setIntentos(activo.getIntentos() + 1);
                    if (activo.getIntentos() >= MAX_INTENTOS_RESET) {
                        activo.setUsadoEn(OffsetDateTime.now());
                    }
                    emailTokenRepository.save(activo);
                });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void validarTokenVigente(EmailToken token, String msgUsado, String msgExpirado) {
        if (token.getUsadoEn() != null) {
            throw new IllegalArgumentException(msgUsado);
        }
        if (token.getExpiraEn().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException(msgExpirado);
        }
    }

    private String construirLinkVerificacion(String rawToken) {
        String base = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
        return base + "/#verificar?token=" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
    }

    private String generarCodigo4Digitos() {
        // Rango [1000, 9999] — siempre 4 dígitos (no empieza con 0 para que la
        // longitud sea consistente y el "letter-spacing" del input quede parejo)
        int n = 1_000 + RNG.nextInt(9_000);
        return String.valueOf(n);
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
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
