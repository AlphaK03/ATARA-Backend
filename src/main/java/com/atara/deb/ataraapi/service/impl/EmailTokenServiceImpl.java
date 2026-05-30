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

    private static final int MAX_INTENTOS_RESET = 5;

    /** Generador criptográficamente seguro para los códigos de un solo uso. */
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EmailTokenRepository emailTokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    public EmailTokenServiceImpl(EmailTokenRepository emailTokenRepository,
                                  UsuarioRepository usuarioRepository,
                                  EmailService emailService,
                                  PasswordEncoder passwordEncoder) {
        this.emailTokenRepository = emailTokenRepository;
        this.usuarioRepository    = usuarioRepository;
        this.emailService         = emailService;
        this.passwordEncoder      = passwordEncoder;
    }

    /**
     * Genera un código de 4 dígitos, lo persiste hasheado y envía el correo.
     * Si el correo no existe, no lanza error (evita enumeración de usuarios).
     */
    @Override
    public void solicitarResetPassword(String correo) {
        usuarioRepository.findByCorreo(correo).ifPresent(usuario -> {
            // Invalidar tokens anteriores pendientes del mismo tipo
            emailTokenRepository.invalidarPendientesPorUsuario(usuario.getId(), TipoEmailToken.RESET_PASSWORD);

            // Código de 6 dígitos con generador criptográfico. El hash se liga al id del
            // usuario para evitar colisiones del token_hash (columna UNIQUE) y para impedir
            // que un código validado para un usuario sirva en el token de otro.
            String codigo  = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
            String hash    = sha256(codigo + "|" + usuario.getId());

            EmailToken token = EmailToken.builder()
                    .usuario(usuario)
                    .tipo(TipoEmailToken.RESET_PASSWORD)
                    .tokenHash(hash)
                    .expiraEn(OffsetDateTime.now().plusMinutes(15))
                    .intentos(0)
                    .build();

            emailTokenRepository.save(token);
            emailService.enviarCodigoReset(correo, usuario.getNombre(), codigo);
        });
    }

    /**
     * Valida el código, actualiza la contraseña y marca el token como usado.
     * Aplica conteo de intentos fallidos (máximo 5).
     */
    // noRollbackFor: un código incorrecto lanza IllegalArgumentException, pero el
    // incremento del contador de intentos (y la invalidación por bloqueo) DEBEN
    // persistir. Sin esto, el rollback de la transacción borraría el incremento y
    // el límite de intentos nunca tendría efecto (el bug original del hallazgo C-03).
    @Override
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public void confirmarResetPassword(String correo, String codigo, String nuevaPassword) {
        // Mensaje genérico y unificado: no revela si el correo existe (evita enumeración).
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new IllegalArgumentException("Código incorrecto o expirado."));

        // El token se localiza POR USUARIO (no por el hash del código), de modo que un
        // código equivocado cuenta como intento fallido contra el token de la víctima.
        EmailToken token = emailTokenRepository
                .findTopByUsuarioIdAndTipoAndUsadoEnIsNullOrderByIdDesc(
                        usuario.getId(), TipoEmailToken.RESET_PASSWORD)
                .orElseThrow(() -> new IllegalArgumentException("Código incorrecto o expirado."));

        if (token.getExpiraEn().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("El código ha expirado. Solicita uno nuevo.");
        }

        // Bloqueo por fuerza bruta: agotados los intentos, se invalida el token.
        if (token.getIntentos() >= MAX_INTENTOS_RESET) {
            token.setUsadoEn(OffsetDateTime.now());
            emailTokenRepository.save(token);
            throw new IllegalArgumentException("Demasiados intentos fallidos. Solicita un nuevo código.");
        }

        String hash = sha256(codigo + "|" + usuario.getId());
        if (!token.getTokenHash().equals(hash)) {
            // Intento fallido: incrementar y persistir (gracias a noRollbackFor).
            token.setIntentos(token.getIntentos() + 1);
            emailTokenRepository.save(token);
            throw new IllegalArgumentException("Código incorrecto o expirado.");
        }

        // Código correcto — marcar token como usado y actualizar contraseña.
        token.setUsadoEn(OffsetDateTime.now());
        emailTokenRepository.save(token);

        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
    }

    /**
     * Genera un UUID como token de verificación, lo persiste hasheado y envía el correo.
     */
    @Override
    public void enviarVerificacionNuevoUsuario(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado."));

        emailTokenRepository.invalidarPendientesPorUsuario(usuarioId, TipoEmailToken.VERIFICACION_EMAIL);

        String uuid = UUID.randomUUID().toString();
        String hash = sha256(uuid);
        String url  = frontendUrl + "/#verificar-email?token=" + uuid;

        EmailToken token = EmailToken.builder()
                .usuario(usuario)
                .tipo(TipoEmailToken.VERIFICACION_EMAIL)
                .tokenHash(hash)
                .expiraEn(OffsetDateTime.now().plusHours(24))
                .intentos(0)
                .build();

        emailTokenRepository.save(token);
        emailService.enviarVerificacionEmail(usuario.getCorreo(), usuario.getNombre(), url);
    }

    /**
     * Verifica el token UUID del correo de bienvenida y activa la cuenta.
     */
    @Override
    public void confirmarVerificacionEmail(String tokenRaw) {
        String hash = sha256(tokenRaw);

        EmailToken token = emailTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new IllegalArgumentException("Enlace de verificación no válido."));

        if (token.getUsadoEn() != null) {
            throw new IllegalArgumentException("Este enlace ya fue utilizado.");
        }

        if (token.getExpiraEn().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("El enlace ha expirado. Solicita uno nuevo al administrador.");
        }

        token.setUsadoEn(OffsetDateTime.now());
        emailTokenRepository.save(token);

        Usuario usuario = token.getUsuario();
        usuario.setEmailVerificado(true);
        usuarioRepository.save(usuario);
    }

    // ── Utilidades ────────────────────────────────────────────────────────────

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
            throw new RuntimeException("SHA-256 no disponible", e);
        }
    }
}
