package com.atara.deb.ataraapi.funcional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.client.NoOpResponseErrorHandler;
import org.springframework.web.client.RestTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Clase base para todas las pruebas funcionales de ATARA.
 *
 * Usa el patrón "singleton container": POSTGRES se inicia una sola vez
 * al cargar la clase y se detiene al finalizar la JVM, lo que evita que
 * cada subclase arranque/detenga el contenedor de forma independiente.
 *
 * Flyway aplica las migraciones V1–V11 la primera vez que Spring arranca
 * el contexto. El contexto se reutiliza en todas las clases de prueba
 * gracias a la caché de Spring Test.
 *
 * Credenciales del seed (V2/V9, password = "Admin1234!"):
 *   admin@atara.mep.go.cr      → ADMIN
 *   mgarcia@atara.mep.go.cr    → DOCENTE  (secciones 1 y 3, todas las materias)
 *   kcortes@atara.mep.go.cr    → DOCENTE  (sección 4, solo Matemáticas)
 *   jperez@atara.mep.go.cr     → COORDINADOR
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class IntegrationTestBase {

    // ── IDs estables derivados del orden de inserción en las migraciones ──
    protected static final long  ID_USUARIO_ADMIN    = 1L;
    protected static final long  ID_USUARIO_MARIA    = 2L;
    protected static final long  ID_USUARIO_KEYLOR   = 5L;
    protected static final long  ID_SECCION_KEYLOR_4A   = 4L;
    protected static final long  ID_SECCION_BOLIVAR_1A  = 1L;
    protected static final long  ID_PERIODO_I_TRIMESTRE = 1L;
    protected static final int   ID_MATERIA_MATEMATICAS = 1;
    protected static final int   ID_MATERIA_ESPANOL     = 2;
    protected static final int   ID_TIPO_SABER_CONCEPTUAL    = 1;
    protected static final int   ID_TIPO_SABER_PROCEDIMENTAL = 2;
    // Ejes de Matemáticas Conceptual (V6: posiciones 22–28)
    protected static final int[] EJES_MATEMATICAS_CONCEPTUAL = {22, 23, 24, 25, 26, 27, 28};
    // Ejes de Español Conceptual (V4: posiciones 1–7)
    protected static final int[] EJES_ESPANOL_CONCEPTUAL = {1, 2, 3, 4, 5, 6, 7};
    // Estudiantes de la sección 4°A de Keylor (V9: ids 31–35)
    protected static final long  ID_ESTUDIANTE_KEYLOR_1 = 31L;
    protected static final long  ID_ESTUDIANTE_KEYLOR_2 = 32L;
    protected static final long  ID_ESTUDIANTE_KEYLOR_3 = 33L;
    // Primer estudiante de la sección 1°A de María (V2)
    protected static final long  ID_ESTUDIANTE_MARIA_1  = 1L;

    // ── Singleton container — inicia una sola vez para toda la sesión ─────
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:15-alpine")
                    .withDatabaseName("atara_test")
                    .withUsername("atara_user")
                    .withPassword("atara_pass_123");

    static {
        POSTGRES.start();   // Testcontainers registra shutdown hook automáticamente
    }

    @DynamicPropertySource
    static void overrideDataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    // ── ObjectMapper y RestTemplate — sin depender de beans de Spring ─────
    protected static final ObjectMapper MAPPER = new ObjectMapper();

    private static final RestTemplate REST_TEMPLATE;
    static {
        REST_TEMPLATE = new RestTemplate();
        REST_TEMPLATE.setErrorHandler(new NoOpResponseErrorHandler());
    }

    // ── Inyecciones ───────────────────────────────────────────────────────
    @LocalServerPort
    protected int port;

    @Autowired
    protected JdbcTemplate jdbc;

    // ── URL helper ────────────────────────────────────────────────────────
    protected String url(String path) {
        return "http://localhost:" + port + path;
    }

    // ── Helpers de autenticación ─────────────────────────────────────────
    protected String obtenerToken(String correo, String password) throws Exception {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = MAPPER.writeValueAsString(Map.of("correo", correo, "password", password));
        var resp = REST_TEMPLATE.exchange(
                url("/api/auth/login"), HttpMethod.POST,
                new HttpEntity<>(body, headers), String.class);
        return MAPPER.readTree(resp.getBody()).get("accessToken").asText();
    }

    protected String tokenAdmin() throws Exception {
        return obtenerToken("admin@atara.mep.go.cr", "Admin1234!");
    }
    protected String tokenKeylor() throws Exception {
        return obtenerToken("kcortes@atara.mep.go.cr", "Admin1234!");
    }
    protected String tokenMaria() throws Exception {
        return obtenerToken("mgarcia@atara.mep.go.cr", "Admin1234!");
    }

    // ── Helpers HTTP ──────────────────────────────────────────────────────
    protected ResponseEntity<String> get(String path, String token) {
        var headers = new HttpHeaders();
        if (token != null) headers.setBearerAuth(token);
        return REST_TEMPLATE.exchange(url(path), HttpMethod.GET,
                new HttpEntity<>(headers), String.class);
    }

    protected ResponseEntity<String> post(String path, Object body, String token)
            throws Exception {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) headers.setBearerAuth(token);
        String json = (body != null) ? MAPPER.writeValueAsString(body) : null;
        return REST_TEMPLATE.exchange(url(path), HttpMethod.POST,
                new HttpEntity<>(json, headers), String.class);
    }

    protected JsonNode parseJson(ResponseEntity<String> response) throws Exception {
        return MAPPER.readTree(response.getBody());
    }

    // ── Helper: cuerpo de EvaluacionSaber ────────────────────────────────
    protected Map<String, Object> bodyEvaluacionSaber(
            long estudianteId, long periodoId, long usuarioId,
            long seccionId, int materiaId, int tipoSaberId,
            int[] ejeIds, int valor) {

        var detalles = new ArrayList<>();
        for (int ejeId : ejeIds) {
            detalles.add(Map.of("ejeTemaaticoId", ejeId, "valor", valor));
        }
        return Map.of(
                "estudianteId", estudianteId,
                "periodoId",    periodoId,
                "usuarioId",    usuarioId,
                "seccionId",    seccionId,
                "materiaId",    materiaId,
                "tipoSaberId",  tipoSaberId,
                "detalles",     detalles
        );
    }

    // ── Limpieza de datos escritos por pruebas ────────────────────────────
    /** Borra evaluaciones_saber y dependientes para los estudiantes indicados. */
    protected void limpiarEvaluacionesSaber(long... estudianteIds) {
        var placeholders = new StringBuilder();
        var args = new Object[estudianteIds.length];
        for (int i = 0; i < estudianteIds.length; i++) {
            if (i > 0) placeholders.append(",");
            placeholders.append("?");
            args[i] = estudianteIds[i];
        }
        String inClause = placeholders.toString();
        jdbc.update("DELETE FROM alertas_tematicas WHERE estudiante_id IN (" + inClause + ")", args);
        jdbc.update(
            "DELETE FROM detalle_evaluacion_saber WHERE evaluacion_saber_id IN " +
            "(SELECT id FROM evaluaciones_saber WHERE estudiante_id IN (" + inClause + "))", args);
        jdbc.update("DELETE FROM evaluaciones_saber WHERE estudiante_id IN (" + inClause + ")", args);
    }
}
