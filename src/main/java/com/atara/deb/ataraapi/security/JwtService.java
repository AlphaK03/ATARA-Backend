package com.atara.deb.ataraapi.security;

import com.atara.deb.ataraapi.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    /**
     * Tolerancia de desfase de reloj al validar exp/iat/nbf. Evita que un token
     * recién emitido sea rechazado como "expirado" cuando el reloj del validador
     * (p. ej. un contenedor Docker o una instancia en Railway) adelanta unos
     * segundos respecto al emisor. 60 s es el valor habitual y no debilita la
     * seguridad de forma apreciable frente a un access token de horas.
     */
    private static final long CLOCK_SKEW_SECONDS = 60;

    /**
     * Valor de desarrollo que estuvo versionado en el repositorio y, por tanto,
     * debe considerarse comprometido. Si se detecta como clave efectiva, se aborta
     * el arranque para impedir que se firmen tokens con una clave pública.
     */
    private static final String SECRETO_COMPROMETIDO =
            "atara-jwt-clave-secreta-muy-segura-para-desarrollo-local-2024-x";

    /** Longitud mínima de la clave HMAC (256 bits) requerida por HS256. */
    private static final int LONGITUD_MINIMA_BYTES = 32;

    /** Emisor declarado y exigido en los tokens (defensa en profundidad — hallazgo B-11). */
    private static final String ISSUER = "atara-api";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    /**
     * Registra la configuración EFECTIVA del JWT al arrancar. Sirve para
     * diagnosticar de un vistazo si el entorno (env vars de Railway/local)
     * está fijando un TTL anormalmente corto o si la clave cambió entre
     * despliegues. Nunca se escribe el secreto en claro: solo su longitud.
     */
    @PostConstruct
    void inicializarYValidarClave() {
        // 1) Nunca arrancar con el secreto que estuvo expuesto en el repositorio.
        if (SECRETO_COMPROMETIDO.equals(secret)) {
            throw new IllegalStateException(
                    "jwt.secret tiene el valor de desarrollo que estuvo versionado en el repositorio "
                    + "y debe considerarse comprometido. Defina la variable de entorno JWT_SECRET con "
                    + "una clave aleatoria de al menos " + LONGITUD_MINIMA_BYTES + " bytes.");
        }
        // 2) Si no hay clave válida configurada, generar una EFÍMERA para no bloquear el
        //    desarrollo local. En producción DEBE inyectarse JWT_SECRET: con clave efímera
        //    los tokens no sobreviven reinicios y, en multi-instancia, cada nodo firma distinto.
        if (secret == null || secret.isBlank()
                || secret.getBytes(StandardCharsets.UTF_8).length < LONGITUD_MINIMA_BYTES) {
            byte[] aleatoria = new byte[64];
            new SecureRandom().nextBytes(aleatoria);
            this.secret = Base64.getEncoder().encodeToString(aleatoria);
            log.warn("JWT_SECRET no definido o demasiado corto: se generó una clave ALEATORIA EFÍMERA. "
                    + "Defina JWT_SECRET (>={} bytes) en producción; de lo contrario los tokens se "
                    + "invalidan en cada reinicio y no son válidos entre instancias.", LONGITUD_MINIMA_BYTES);
        }
        log.info("JWT configurado: expiration-ms={} (~{} h), tolerancia clock-skew={} s, longitud de clave={} bytes",
                expirationMs,
                String.format("%.2f", expirationMs / 3_600_000.0),
                CLOCK_SKEW_SECONDS,
                secret.getBytes(StandardCharsets.UTF_8).length);
    }

    /**
     * Genera un access token JWT para el usuario dado.
     * Claims incluidos: subject=correo, userId, rol.
     */
    public String generarToken(Usuario usuario) {
        Date ahora = new Date();
        Date expiracion = new Date(ahora.getTime() + expirationMs);

        return Jwts.builder()
                .issuer(ISSUER)
                .subject(usuario.getCorreo())
                .claim("userId", usuario.getId())
                .claim("rol", usuario.getRol().getNombre())
                .issuedAt(ahora)
                .expiration(expiracion)
                .signWith(getSigningKey())
                .compact();
    }

    /** Extrae el correo (subject) del token. */
    public String extraerCorreo(String token) {
        return extraerClaim(token, Claims::getSubject);
    }

    /** Extrae el userId del token. */
    public Long extraerUserId(String token) {
        return extraerClaim(token, claims -> claims.get("userId", Long.class));
    }

    /** Extrae el rol del token. */
    public String extraerRol(String token) {
        return extraerClaim(token, claims -> claims.get("rol", String.class));
    }

    /**
     * Valida que el token pertenezca al usuario y no haya expirado.
     * No lanza excepción — devuelve false si hay cualquier problema.
     *
     * La expiración la valida el propio parser de JJWT al parsear los claims
     * (lanza {@link io.jsonwebtoken.ExpiredJwtException} si el token expiró más
     * allá de la tolerancia de clock-skew). Por eso NO repetimos aquí una
     * comparación manual {@code exp.before(new Date())}: hacerlo ignoraría el
     * clock-skew y rechazaría tokens que el parser sí acepta dentro del margen.
     */
    public boolean esTokenValido(String token, UserDetails userDetails) {
        try {
            String correo = extraerCorreo(token);   // parsea y verifica firma + expiración (con clock-skew)
            return correo != null && correo.equals(userDetails.getUsername());
        } catch (Exception e) {
            return false;
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    // -------------------------------------------------------------------------

    private <T> T extraerClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .requireIssuer(ISSUER)
                .clockSkewSeconds(CLOCK_SKEW_SECONDS)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
