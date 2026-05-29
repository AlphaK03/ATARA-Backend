package com.atara.deb.ataraapi.security;

import com.atara.deb.ataraapi.model.Rol;
import com.atara.deb.ataraapi.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifica la validación de access tokens, con foco en la tolerancia de
 * clock-skew añadida para evitar 401 espurios cuando el reloj del validador
 * adelanta unos segundos respecto al emisor.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JwtServiceTest {

    private static final String SECRET = "clave-de-prueba-suficientemente-larga-para-hmac-sha256-2024-x";
    private static final String CORREO = "docente@atara.test";

    private JwtService jwtService;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", SECRET);
        userDetails = User.withUsername(CORREO).password("x").authorities("ROLE_DOCENTE").build();
    }

    private Usuario usuarioFalso() {
        Rol rol = mock(Rol.class);
        when(rol.getNombre()).thenReturn("DOCENTE");
        Usuario u = mock(Usuario.class);
        when(u.getId()).thenReturn(1L);
        when(u.getCorreo()).thenReturn(CORREO);
        when(u.getRol()).thenReturn(rol);
        return u;
    }

    /** Genera un token cuyo exp queda a {@code expirationMs} de ahora (negativo = ya expirado). */
    private String tokenConTtl(long expirationMs) {
        ReflectionTestUtils.setField(jwtService, "expirationMs", expirationMs);
        return jwtService.generarToken(usuarioFalso());
    }

    @Test
    void tokenVigenteConSubjectCorrectoEsValido() {
        String token = tokenConTtl(3_600_000L); // 1 h
        assertThat(jwtService.esTokenValido(token, userDetails)).isTrue();
    }

    @Test
    void tokenExpiradoDentroDelClockSkewSigueSiendoValido() {
        // Expiró hace 30 s: dentro de la tolerancia de 60 s → debe aceptarse.
        String token = tokenConTtl(-30_000L);
        assertThat(jwtService.esTokenValido(token, userDetails)).isTrue();
    }

    @Test
    void tokenExpiradoMasAllaDelClockSkewEsInvalido() {
        // Expiró hace 5 min: fuera de la tolerancia → debe rechazarse.
        String token = tokenConTtl(-300_000L);
        assertThat(jwtService.esTokenValido(token, userDetails)).isFalse();
    }

    @Test
    void tokenDeOtroUsuarioEsInvalido() {
        String token = tokenConTtl(3_600_000L);
        UserDetails otro = User.withUsername("otro@atara.test").password("x").authorities("ROLE_DOCENTE").build();
        assertThat(jwtService.esTokenValido(token, otro)).isFalse();
    }

    @Test
    void tokenMalformadoEsInvalido() {
        assertThat(jwtService.esTokenValido("no-es-un-jwt", userDetails)).isFalse();
    }
}
