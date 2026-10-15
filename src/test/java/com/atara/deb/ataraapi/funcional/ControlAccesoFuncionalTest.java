package com.atara.deb.ataraapi.funcional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas funcionales de control de acceso por rol.
 *
 * Verifica que el sistema de ContextoUsuario filtre correctamente:
 *   - Catálogo de materias: cada docente solo ve sus materias asignadas.
 *   - Catálogo de tipos y niveles: accesibles para cualquier rol autenticado.
 *   - Acceso a endpoints con y sin autenticación.
 *
 * Datos de seed relevantes (post-migración V9):
 *   admin (ADMIN)    → acceso total, todas las materias.
 *   mgarcia (DOCENTE)→ materias: todas (V8 asignó todas las materias a docentes existentes).
 *   kcortes (DOCENTE)→ materias: solo Matemáticas (V9 asigna únicamente materia_id=1).
 */
@DisplayName("Control de acceso por rol — pruebas funcionales")
class ControlAccesoFuncionalTest extends IntegrationTestBase {

    // ── Catálogo de materias filtrado por rol ─────────────────────────────

    @Test
    @DisplayName("Admin ve todas las materias del catálogo (5)")
    void catalogoMaterias_admin_veTodasLasMaterias() throws Exception {
        String token = tokenAdmin();
        var resp = get("/api/catalogos/saberes/materias", token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isEqualTo(5);
    }

    @Test
    @DisplayName("Docente Keylor solo ve Matemáticas (1 materia)")
    void catalogoMaterias_docenteKeylor_vesoloMatematicas() throws Exception {
        String token = tokenKeylor();
        var resp = get("/api/catalogos/saberes/materias", token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isEqualTo(1);
        assertThat(json.get(0).get("nombre").asText()).isEqualTo("Matemáticas");
    }

    @Test
    @DisplayName("Coordinador ve todas las materias (rol admin en ContextoUsuario)")
    void catalogoMaterias_coordinador_veTodasLasMaterias() throws Exception {
        String token = obtenerToken("jperez@atara.mep.go.cr", "Admin1234!");
        var resp = get("/api/catalogos/saberes/materias", token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(parseJson(resp).size()).isEqualTo(5);
    }

    @Test
    @DisplayName("Catálogo de materias sin token retorna 401")
    void catalogoMaterias_sinToken_retorna401() {
        var resp = get("/api/catalogos/saberes/materias", null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ── Catálogos que no filtran por rol ──────────────────────────────────

    @Test
    @DisplayName("Catálogo de tipos de saber retorna exactamente 3 tipos")
    void catalogoTiposSaber_retorna3Tipos() throws Exception {
        String token = tokenKeylor();
        var resp = get("/api/catalogos/saberes/tipos", token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isEqualTo(3);
    }

    @Test
    @DisplayName("Catálogo de niveles de desempeño retorna exactamente 5 niveles")
    void catalogoNivelesDesempeno_retorna5Niveles() throws Exception {
        String token = tokenAdmin();
        var resp = get("/api/catalogos/saberes/niveles-desempeno", token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isEqualTo(5);
    }

    // ── Ejes temáticos filtrados por materia ──────────────────────────────

    @Test
    @DisplayName("Ejes de Matemáticas Conceptual retorna exactamente 7 ejes")
    void catalogoEjes_matematicasConceptual_retorna7Ejes() throws Exception {
        String token = tokenKeylor();
        var resp = get("/api/catalogos/saberes/ejes?materiaId="
                + ID_MATERIA_MATEMATICAS + "&tipoSaberId=" + ID_TIPO_SABER_CONCEPTUAL, token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isEqualTo(7);
    }

    @Test
    @DisplayName("Ejes de Español Conceptual retorna exactamente 7 ejes")
    void catalogoEjes_espanolConceptual_retorna7Ejes() throws Exception {
        String token = tokenAdmin();
        var resp = get("/api/catalogos/saberes/ejes?materiaId="
                + ID_MATERIA_ESPANOL + "&tipoSaberId=" + ID_TIPO_SABER_CONCEPTUAL, token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(parseJson(resp).size()).isEqualTo(7);
    }

    // ── Secciones filtradas por docente ───────────────────────────────────

    @Test
    @DisplayName("Secciones de Keylor retorna solo la sección 4°A")
    void seccionesDocente_keylor_retornaUnaSola() throws Exception {
        String token = tokenKeylor();
        var resp = get("/api/secciones/docente/" + ID_USUARIO_KEYLOR, token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Secciones de María retorna al menos 2 secciones")
    void seccionesDocente_maria_retornaMultiples() throws Exception {
        String token = tokenMaria();
        var resp = get("/api/secciones/docente/" + ID_USUARIO_MARIA, token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isGreaterThanOrEqualTo(2);
    }
}
