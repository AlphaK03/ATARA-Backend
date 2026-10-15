package com.atara.deb.ataraapi.funcional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas funcionales del módulo de Alertas Temáticas.
 *
 * Flujo evaluado:
 *   1. Registrar una EvaluacionSaber con valores conocidos.
 *   2. Llamar a POST /api/alertas-tematicas/generar/estudiante/{id}/periodo/{id}.
 *   3. Verificar que el nivel de alerta generado corresponde a los valores ingresados.
 *
 * Reglas del dominio:
 *   promedio ≤ 2.0  → ALTA
 *   2.1 – 3.0       → MEDIA
 *   > 3.0           → SIN_ALERTA
 */
@DisplayName("Alertas Temáticas — pruebas funcionales")
class AlertaTematicaFuncionalTest extends IntegrationTestBase {

    // Usamos los estudiantes 32 y 33 de Keylor para no colisionar con
    // EvaluacionSaberFuncionalTest (que usa el 31) dentro de la misma sesión.
    private static final long ID_ESTUDIANTE_2 = 32L;
    private static final long ID_ESTUDIANTE_3 = 33L;

    @AfterEach
    void cleanup() {
        limpiarEvaluacionesSaber(ID_ESTUDIANTE_2, ID_ESTUDIANTE_3);
    }

    // ── Generación de alertas ─────────────────────────────────────────────

    @Test
    @DisplayName("Valores bajos (≤2) generan alerta nivel ALTA")
    void generarAlertas_valoresBajos_generaAlertaAlta() throws Exception {
        String token = tokenKeylor();
        var bodyEval = bodyEvaluacionSaber(
                ID_ESTUDIANTE_2, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                EJES_MATEMATICAS_CONCEPTUAL, 1);

        assertThat(post("/api/evaluaciones-saber", bodyEval, token).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);

        var resp = post("/api/alertas-tematicas/generar/estudiante/"
                + ID_ESTUDIANTE_2 + "/periodo/" + ID_PERIODO_I_TRIMESTRE, null, token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.isEmpty()).isFalse();
        assertThat(json.get(0).get("nivelAlerta").asText()).isEqualTo("ALTA");
    }

    @Test
    @DisplayName("Valores altos (>3) no generan alertas (SIN_ALERTA no se persiste)")
    void generarAlertas_valoresAltos_noGeneraAlertas() throws Exception {
        String token = tokenKeylor();
        var bodyEval = bodyEvaluacionSaber(
                ID_ESTUDIANTE_3, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                EJES_MATEMATICAS_CONCEPTUAL, 5);

        assertThat(post("/api/evaluaciones-saber", bodyEval, token).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);

        var resp = post("/api/alertas-tematicas/generar/estudiante/"
                + ID_ESTUDIANTE_3 + "/periodo/" + ID_PERIODO_I_TRIMESTRE, null, token);

        // Promedio = 5.0 → SIN_ALERTA; el servicio omite guardar estas alertas → lista vacía
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.isEmpty()).isTrue();
    }

    @Test
    @DisplayName("Generar y consultar alertas retorna la misma cantidad")
    void generarYObtenerAlertas_cantidadCoherente() throws Exception {
        String token = tokenKeylor();
        var bodyEval = bodyEvaluacionSaber(
                ID_ESTUDIANTE_2, ID_PERIODO_I_TRIMESTRE,
                ID_USUARIO_KEYLOR, ID_SECCION_KEYLOR_4A,
                ID_MATERIA_MATEMATICAS, ID_TIPO_SABER_CONCEPTUAL,
                EJES_MATEMATICAS_CONCEPTUAL, 2);

        post("/api/evaluaciones-saber", bodyEval, token);

        var genResp = post("/api/alertas-tematicas/generar/estudiante/"
                + ID_ESTUDIANTE_2 + "/periodo/" + ID_PERIODO_I_TRIMESTRE, null, token);
        assertThat(genResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        int cantidadGenerada = parseJson(genResp).size();

        var getResp = get("/api/alertas-tematicas/estudiante/"
                + ID_ESTUDIANTE_2 + "/periodo/" + ID_PERIODO_I_TRIMESTRE, token);
        assertThat(getResp.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(parseJson(getResp).size()).isEqualTo(cantidadGenerada);
    }

    // ── Seguridad ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Generar alertas sin token retorna 401")
    void generarAlertas_sinToken_retorna401() throws Exception {
        var resp = post("/api/alertas-tematicas/generar/estudiante/31/periodo/1", null, null);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Obtener alertas de estudiante sin evaluaciones retorna lista vacía")
    void obtenerAlertas_estudianteSinEvaluaciones_retornaListaVacia() throws Exception {
        String token = tokenAdmin();
        // estudiante 31 no tiene alertas generadas previamente en la BD de prueba
        var resp = get("/api/alertas-tematicas/estudiante/31/periodo/1", token);

        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
        var json = parseJson(resp);
        assertThat(json.isArray()).isTrue();
        assertThat(json.size()).isEqualTo(0);
    }
}
