package com.atara.deb.ataraapi.funcional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas funcionales del módulo de autenticación.
 *
 * Cubre: login correcto, credenciales inválidas, formato inválido,
 * acceso sin token y consulta del usuario autenticado (/me).
 */
@DisplayName("Autenticación — pruebas funcionales")
class AuthFuncionalTest extends IntegrationTestBase {

    // ── Login exitoso ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Login con credenciales correctas retorna token JWT y datos del usuario")
    void login_credencialesCorrectas_retornaTokenYDatosDeUsuario() throws Exception {
        var resp = post("/api/auth/login",
                Map.of("correo", "admin@atara.mep.go.cr", "password", "Admin1234!"), null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var body = parseJson(resp);
        assertThat(body.get("accessToken").asText()).isNotBlank();
        assertThat(body.get("refreshToken").asText()).isNotBlank();
        assertThat(body.get("tokenType").asText()).isEqualTo("Bearer");
        assertThat(body.get("rol").asText()).isEqualTo("ADMIN");
        assertThat(body.get("correo").asText()).isEqualTo("admin@atara.mep.go.cr");
    }

    @Test
    @DisplayName("Login de docente retorna rol DOCENTE")
    void login_docente_retornaRolDocente() throws Exception {
        var resp = post("/api/auth/login",
                Map.of("correo", "kcortes@atara.mep.go.cr", "password", "Admin1234!"), null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var body = parseJson(resp);
        assertThat(body.get("rol").asText()).isEqualTo("DOCENTE");
        assertThat(body.get("correo").asText()).isEqualTo("kcortes@atara.mep.go.cr");
        assertThat(body.get("accessToken").asText()).isNotBlank();
    }

    // ── Credenciales inválidas ────────────────────────────────────────────

    @Test
    @DisplayName("Login con contraseña incorrecta retorna 401")
    void login_passwordIncorrecta_retorna401() throws Exception {
        var resp = post("/api/auth/login",
                Map.of("correo", "admin@atara.mep.go.cr", "password", "ContraseniaErronea!"), null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Login con correo inexistente retorna 401")
    void login_correoInexistente_retorna401() throws Exception {
        var resp = post("/api/auth/login",
                Map.of("correo", "noexiste@atara.mep.go.cr", "password", "Admin1234!"), null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Login con formato de correo inválido retorna 400")
    void login_formatoCorreoInvalido_retorna400() throws Exception {
        var resp = post("/api/auth/login",
                Map.of("correo", "esto-no-es-un-correo", "password", "Admin1234!"), null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Login con cuerpo vacío retorna 400")
    void login_cuerpoVacio_retorna400() throws Exception {
        var resp = post("/api/auth/login", Map.of(), null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ── Endpoints protegidos ──────────────────────────────────────────────

    @Test
    @DisplayName("Endpoint protegido sin token retorna 401")
    void endpointProtegido_sinToken_retorna401() {
        var resp = get("/api/estudiantes", null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Endpoint protegido con token inválido retorna 401")
    void endpointProtegido_tokenInvalido_retorna401() {
        var resp = get("/api/estudiantes", "token.invalido.aqui");

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ── /me ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/auth/me con token válido retorna datos del usuario autenticado")
    void me_tokenValido_retornaDatosDelUsuario() throws Exception {
        String token = tokenAdmin();
        var resp = get("/api/auth/me", token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var body = parseJson(resp);
        assertThat(body.get("correo").asText()).isEqualTo("admin@atara.mep.go.cr");
        assertThat(body.get("rol").asText()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("GET /api/auth/me sin token retorna 401")
    void me_sinToken_retorna401() {
        var resp = get("/api/auth/me", null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
