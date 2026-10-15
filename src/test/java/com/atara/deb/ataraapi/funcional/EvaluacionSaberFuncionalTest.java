package com.atara.deb.ataraapi.funcional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas funcionales del módulo de Evaluaciones por Saber.
 *
 * Flujo evaluado:
 *   Keylor (docente, sección 4°A, solo Matemáticas) registra evaluaciones
 *   para su primer estudiante (id=31) en el I Trimestre.
 *
 * Aislamiento: @AfterEach elimina los datos escritos por cada test usando
 * limpiarEvaluacionesSaber, ya que @Transactional no funciona con RANDOM_PORT.
 */
@DisplayName("Evaluaciones por Saber — pruebas funcionales")
class EvaluacionSaberFuncionalTest extends IntegrationTestBase {

    @AfterEach
    void cleanup() {
        limpiarEvaluacionesSaber(ID_ESTUDIANTE_KEYLOR_1);
    }

    // ── POST /api/evaluaciones-saber ──────────────────────────────────────

    @Test
    @DisplayName("Registrar evaluación válida retorna 201 con el ID generado")
    void registrar_evaluacionValida_retorna201ConId() throws Exception {
        String token = tokenKeylor();
        var body = bodyEvaluacionSaber(
                ID_ESTUDIANTE_KEYLOR_1, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                EJES_MATEMATICAS_CONCEPTUAL, 3);

        var resp = post("/api/evaluaciones-saber", body, token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var json = parseJson(resp);
        assertThat(json.get("id").asLong()).isPositive();
        assertThat(json.get("estudianteId").asLong()).isEqualTo(ID_ESTUDIANTE_KEYLOR_1);
        assertThat(json.get("materiaId").asInt()).isEqualTo(ID_MATERIA_MATEMATICAS);
        assertThat(json.get("detalles").isArray()).isTrue();
        assertThat(json.get("detalles").size()).isEqualTo(EJES_MATEMATICAS_CONCEPTUAL.length);
    }

    @Test
    @DisplayName("Registrar evaluación y recuperarla por ID retorna los mismos datos")
    void registrar_yBuscarPorId_retornaMismosDatos() throws Exception {
        String token = tokenKeylor();
        var body = bodyEvaluacionSaber(
                ID_ESTUDIANTE_KEYLOR_1, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                EJES_MATEMATICAS_CONCEPTUAL, 4);

        var createResp = post("/api/evaluaciones-saber", body, token);
        assertThat(createResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        long id = parseJson(createResp).get("id").asLong();

        var getResp = get("/api/evaluaciones-saber/" + id, token);
        assertThat(getResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(getResp);
        assertThat(json.get("id").asLong()).isEqualTo(id);
        assertThat(json.get("tipoSaberId").asInt()).isEqualTo(ID_TIPO_SABER_CONCEPTUAL);
        assertThat(json.get("detalles").size()).isEqualTo(EJES_MATEMATICAS_CONCEPTUAL.length);
    }

    @Test
    @DisplayName("Registrar evaluación y consultar promedios retorna promedios coherentes")
    void registrar_yConsultarPromedios_retornaPromediosCoherentes() throws Exception {
        String token = tokenKeylor();
        var body = bodyEvaluacionSaber(
                ID_ESTUDIANTE_KEYLOR_1, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                EJES_MATEMATICAS_CONCEPTUAL, 4);

        post("/api/evaluaciones-saber", body, token);

        var resp = get("/api/evaluaciones-saber/promedios/estudiante/"
                + ID_ESTUDIANTE_KEYLOR_1 + "/periodo/" + ID_PERIODO_I_TRIMESTRE, token);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.get("estudianteId").asLong()).isEqualTo(ID_ESTUDIANTE_KEYLOR_1);
        assertThat(json.get("promediosPorTipoSaber").isArray()).isTrue();
        assertThat(json.get("promediosPorTipoSaber").isEmpty()).isFalse();
    }

    @Test
    @DisplayName("Listar evaluaciones por estudiante y periodo retorna la evaluación registrada")
    void listarPorEstudianteYPeriodo_retornaEvaluacionCreada() throws Exception {
        String token = tokenKeylor();
        var body = bodyEvaluacionSaber(
                ID_ESTUDIANTE_KEYLOR_1, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                EJES_MATEMATICAS_CONCEPTUAL, 3);

        post("/api/evaluaciones-saber", body, token);

        var resp = get("/api/evaluaciones-saber/estudiante/"
                + ID_ESTUDIANTE_KEYLOR_1 + "/periodo/" + ID_PERIODO_I_TRIMESTRE, token);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isGreaterThanOrEqualTo(1);
        assertThat(json.get(0).get("estudianteId").asLong()).isEqualTo(ID_ESTUDIANTE_KEYLOR_1);
    }

    // ── Validaciones de entrada ───────────────────────────────────────────

    @Test
    @DisplayName("Registrar evaluación sin token retorna 401")
    void registrar_sinToken_retorna401() throws Exception {
        var body = bodyEvaluacionSaber(
                ID_ESTUDIANTE_KEYLOR_1, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                EJES_MATEMATICAS_CONCEPTUAL, 3);

        var resp = post("/api/evaluaciones-saber", body, null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Registrar evaluación sin detalles retorna 400")
    void registrar_sinDetalles_retorna400() throws Exception {
        String token = tokenKeylor();
        var body = Map.of(
                "estudianteId", ID_ESTUDIANTE_KEYLOR_1,
                "periodoId",    ID_PERIODO_I_TRIMESTRE,
                "usuarioId",    ID_USUARIO_KEYLOR,
                "seccionId",    ID_SECCION_KEYLOR_4A,
                "materiaId",    ID_MATERIA_MATEMATICAS,
                "tipoSaberId",  ID_TIPO_SABER_CONCEPTUAL,
                "detalles",     List.of()          // lista vacía → falla @Size(min=1)
        );

        var resp = post("/api/evaluaciones-saber", body, token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Registrar evaluación con valor fuera de rango retorna 400")
    void registrar_valorFueraDeRango_retorna400() throws Exception {
        String token = tokenKeylor();
        // valor = 6 → supera @Max(5)
        var body = bodyEvaluacionSaber(
                ID_ESTUDIANTE_KEYLOR_1, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                new int[]{EJES_MATEMATICAS_CONCEPTUAL[0]}, 6);

        var resp = post("/api/evaluaciones-saber", body, token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Buscar evaluación por ID inexistente retorna 404")
    void buscarPorId_inexistente_retorna404() throws Exception {
        String token = tokenAdmin();
        var resp = get("/api/evaluaciones-saber/999999", token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
