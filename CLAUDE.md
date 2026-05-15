# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATARA (Sistema de Alerta Temprana y Atención al Rendimiento Académico) is a Spring Boot REST API backend for an early-alert academic system designed for Costa Rica's Ministry of Public Education (MEP). It tracks student performance across 6 grade levels using a 4-point Likert scale across 5 evaluation dimensions.

**Stack:** Spring Boot 4.0.3, Java 17, PostgreSQL, Flyway, Lombok, Jakarta Validation.

## Commands

```bash
# Start PostgreSQL (required before running the app)
docker-compose up -d

# Run the application (port 8081)
./mvnw spring-boot:run

# Build
./mvnw clean package

# Run all tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=ClassName

# Run a single test method
./mvnw test -Dtest=ClassName#methodName
```

The app runs on **port 8081** (not the default 8080). PostgreSQL is mapped to **port 5433** (not 5432).

## Architecture

Standard Spring Boot layered architecture: `Controller → Service (interface + impl) → Repository → Model`.

```
com.atara.deb.ataraapi/
├── controller/       REST endpoints (/api/*)
├── service/          Interfaces + impl/ subdirectory for implementations
├── repository/       Spring Data JPA repos (all extend JpaRepository<Entity, Long>)
├── model/            28 JPA entities + enums/ subdirectory (9 enums)
├── dto/              Request/Response DTOs organized by domain (alerta/, estudiante/, etc.)
└── exception/        GlobalExceptionHandler (centralized HTTP error mapping)
```

**Database schema is owned by Flyway** — `ddl-auto=none`, never let Hibernate manage schema. Migrations live in `src/main/resources/db/migration/`:
- `V1__init_schema.sql` — 20 tables, 40+ indices, 13 audit triggers
- `V2__sample_data.sql` — seed data (BCrypt password hashes need to be regenerated for auth testing)
- `V3__queries_reference.sql` — 8 reporting views (`vw_criterios_completos`, `vw_rendimiento_periodo_activo`, etc.)
- `V4__evaluacion_saberes_alertas_tematicas.sql` — 6 tables (tipos_saber, ejes_tematicos, niveles_desempeno, evaluaciones_saber, detalle_evaluacion_saber, alertas_tematicas) + 2 views + seed data

**Audit trail** is handled entirely at the database level via the `registro_auditoria` table (JSONB) and `fn_actualizar_updated_at` triggers — no application-level audit code needed.

## Key Domain Concepts

- **Escala de valoración (original)**: 4-point scale — Insuficiente (1), Básico (2), Satisfactorio (3), Destacado (4)
- **Escala de desempeño por saberes**: 5-point scale — Inicial (1), En desarrollo (2), Intermedio (3), Logrado (4), Avanzado (5)
- **Dimensiones de evaluación**: 5 dimensions including Rendimiento Académico, Participación, Hábitos de Estudio, Factores Socioemocionales
- **Tipos de saber**: Conceptual, Procedimental, Actitudinal — each with 7 ejes temáticos (21 total)
- **Structure hierarchy**: Centro Educativo → Sección → Periodo → Evaluacion → DetalleEvaluacion
- **Evaluaciones por saber**: EvaluacionSaber → DetalleEvaluacionSaber (multiple per student/period/tipo_saber)
- **Alertas temáticas**: Generated from averages per eje temático — ALTA (≤2.0), MEDIA (2.1-3.0), SIN_ALERTA (>3.0)
- **Unique constraint on evaluaciones**: `(estudiante_id, usuario_id, periodo_id)` — enforced at DB level

## Current Endpoint Map

| Controller | Method | Path |
|---|---|---|
| EstudianteController | POST | `/api/estudiantes` |
| | GET | `/api/estudiantes` |
| | GET | `/api/estudiantes/{id}` |
| | PUT | `/api/estudiantes/{id}` |
| EvaluacionController | POST | `/api/evaluaciones` |
| | POST | `/api/evaluaciones/{id}/detalles` |
| | GET | `/api/evaluaciones/{id}` |
| | GET | `/api/evaluaciones/estudiante/{estudianteId}` |
| | GET | `/api/evaluaciones/estudiante/{estudianteId}/periodo/{periodoId}` |
| | GET | `/api/evaluaciones/periodo/{periodoId}` |
| MatriculaController | POST | `/api/matriculas` |
| | GET | `/api/matriculas/estudiante/{estudianteId}` |
| | GET | `/api/matriculas/seccion/{seccionId}` |
| AnioLectivoController | POST | `/api/anios-lectivos` |
| | GET | `/api/anios-lectivos` |
| | GET | `/api/anios-lectivos/activo` |
| | GET | `/api/anios-lectivos/{id}` |
| | PUT | `/api/anios-lectivos/{id}` |
| | PUT | `/api/anios-lectivos/{id}/activar` |
| | DELETE | `/api/anios-lectivos/{id}` |
| AlertaController | GET | `/api/alertas/estudiante/{studentId}?periodoId=` |
| | GET | `/api/alertas/seccion/{sectionId}?periodoId=` |
| ReporteController | GET | `/api/reportes/estudiante/{studentId}?materiaId=&periodoId=` |
| VisualizacionController | GET | `/api/visualizaciones/seccion/{sectionId}/distribucion?materiaId=&periodoId=` |
| CatalogoSaberController | GET | `/api/catalogos/saberes/tipos` |
| | GET | `/api/catalogos/saberes/materias` |
| | GET | `/api/catalogos/saberes/ejes?materiaId=&tipoSaberId=` |
| | GET | `/api/catalogos/saberes/niveles-desempeno` |
| EvaluacionSaberController | POST | `/api/evaluaciones-saber` |
| | PUT | `/api/evaluaciones-saber/{id}` |
| | GET | `/api/evaluaciones-saber/{id}` |
| | GET | `/api/evaluaciones-saber/estudiante/{estudianteId}/periodo/{periodoId}` |
| | GET | `/api/evaluaciones-saber/seccion/{seccionId}/periodo/{periodoId}` |
| | GET | `/api/evaluaciones-saber/promedios/estudiante/{estudianteId}/periodo/{periodoId}` |
| | GET | `/api/evaluaciones-saber/promedios/seccion/{seccionId}/periodo/{periodoId}` |
| AlertaTematicaController | POST | `/api/alertas-tematicas/generar/estudiante/{estudianteId}/periodo/{periodoId}` |
| | POST | `/api/alertas-tematicas/generar/seccion/{seccionId}/periodo/{periodoId}` |
| | GET | `/api/alertas-tematicas/estudiante/{estudianteId}/periodo/{periodoId}` |
| | GET | `/api/alertas-tematicas/seccion/{seccionId}/periodo/{periodoId}` |
| SeccionController | GET | `/api/secciones?anioLectivoId=` (filtrado por rol) |
| | GET | `/api/secciones/docente/{docenteId}` (solo ADMIN) |
| | POST | `/api/secciones` (ADMIN/DOCENTE) |
| | PUT | `/api/secciones/{id}` |
| | DELETE | `/api/secciones/{id}` (solo ADMIN, cascada total) |
| | DELETE | `/api/secciones/{id}/docente` (solo DOCENTE titular, sin datos asociados) |
| | GET | `/api/secciones/catalogos/niveles` |
| | GET | `/api/secciones/catalogos/centros` |
| | GET | `/api/secciones/catalogos/docentes` |
| CentroEducativoController | GET | `/api/admin/centros` (solo ADMIN) |
| | GET | `/api/admin/centros/{id}` (solo ADMIN) |
| | POST | `/api/admin/centros` (solo ADMIN) |
| | PUT | `/api/admin/centros/{id}` (solo ADMIN) |
| PeriodoController | POST | `/api/periodos` |
| | GET | `/api/periodos?anioLectivoId=` |
| | GET | `/api/periodos/activo?anioLectivoId=` |
| | PUT | `/api/periodos/{id}` |
| | PUT | `/api/periodos/{id}/activar` |
| | DELETE | `/api/periodos/{id}` |

## Configuration Notes

- Credentials are in `application.properties` (db user: `atara_user`, pass: `atara_pass_123`)
- `spring.jpa.show-sql=true` and `format_sql=true` are enabled — expected in dev, disable for production
- All JPA relationships use `FetchType.LAZY` — be mindful of N+1 query risks when adding new queries
- BCrypt password hashes in `V2__sample_data.sql` are placeholders; regenerate with `new BCryptPasswordEncoder(12).encode("...")` to test auth flows

## Implementation Status (as of 2026-04-01)

These features are planned by the design rules below but **not yet implemented**:

- **Custom exceptions** (`RecursoNoEncontradoException`, `ReglaDeNegocioException`) do not exist. `GlobalExceptionHandler` currently maps `IllegalArgumentException → 400`, `NoSuchElementException → 404`, `UnsupportedOperationException → 501`, `RuntimeException → 500`. When adding new features, create the proper custom exception class and add a handler mapping to `GlobalExceptionHandler`.
- **`ApiResponse<T>` wrapper** is not implemented. Controllers return DTOs directly instead of wrapping in `ApiResponse`. Needs to be created and applied across all controllers.
- ~~**Spring Security / JWT is not implemented**~~. **Implemented** (as of 2026-03-31): `SecurityConfig`, `JwtService`, `JwtAuthenticationFilter`, `UserDetailsServiceImpl`, `AuthController` with login/refresh/logout/me. All endpoints require JWT except `/api/auth/*` and `/actuator/health`.

## Features added (as of 2026-04-01)

- **Auto-creación de periodos**: Al crear un año lectivo, `AnioLectivoServiceImpl` genera automáticamente 3 trimestres (I, II, III) dividiendo el rango de fechas en partes iguales. El I Trimestre queda activo por defecto.
- **Activar periodo**: `PUT /api/periodos/{id}/activar` desactiva todos los periodos del mismo año y activa el seleccionado.
- **Crear sección**: `POST /api/secciones` con `SeccionRequestDto`. Catálogos de soporte: `GET /api/secciones/catalogos/niveles`, `/centros`, `/docentes`. Requiere `NivelRepository` y `CentroEducativoRepository`.
- **Recalificación de evaluaciones por saber**: `PUT /api/evaluaciones-saber/{id}` reemplaza los detalles (scores) de una evaluación existente limpiando con `orphanRemoval` y re-insertando. El wizard del frontend muestra primero una pantalla de selección de saberes con alertas pre-marcadas, luego pre-rellena los valores anteriores.

## Features added (as of 2026-05-14)

- **CRUD de Centros Educativos (ADMIN)**: Nuevo `CentroEducativoController` bajo `/api/admin/centros` con operaciones GET (lista y por id), POST y PUT, todas protegidas con `@PreAuthorize("hasRole('ADMIN')")`. **No se expone DELETE** por política: los centros se conservan como histórico permanente para preservar la integridad referencial de secciones y matrículas. El servicio valida la unicidad del nombre (insensible a mayúsculas) y devuelve 400 ante duplicados.
- **Visibilidad de secciones por rol**: `GET /api/secciones?anioLectivoId=` ahora filtra según el rol del usuario autenticado, leído del `SecurityContext` mediante `UsuarioPrincipal`. ADMIN ve todas las secciones del año lectivo. DOCENTE solo ve aquellas donde es titular (`secciones.docente_id`) o aparece en `usuarios_secciones`. Cualquier otro rol recibe 403 (`AccesoDenegadoException`). Se usa una consulta nativa combinada en `SeccionRepository.findByAnioLectivoIdAndAccesibleParaUsuario`.
- **`GET /api/secciones/docente/{docenteId}` restringido a ADMIN**: Antes cualquier docente podía consultar las secciones de otro pasando un id distinto en la URL. Ahora está protegido con `@PreAuthorize("hasRole('ADMIN')")`. Para que un docente vea sus propias secciones debe usar `GET /api/secciones` (filtrado automático por su identidad).
- **Crear sección con co-docentes y estudiantes en una sola operación**: `SeccionRequestDto` se extendió con dos listas opcionales: `docentesAdicionalesIds[]` y `estudiantesIds[]`. `POST /api/secciones` ahora acepta los roles ADMIN y DOCENTE (`@PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")`). Si el creador es DOCENTE: queda automáticamente como titular y se autoincluye en `usuarios_secciones`; el campo `docenteId` del DTO se ignora para este rol. Los `docentesAdicionalesIds` se insertan en `usuarios_secciones`. Los `estudiantesIds` generan `Matricula` ACTIVAS en el año lectivo de la sección dentro de la misma transacción, respetando la regla "un estudiante una matrícula por año".
- **Nuevo `UsuarioSeccionRepository`**: La tabla intermedia `usuarios_secciones` ya existía como entidad JPA pero sin repositorio. Se añadió con métodos `findBySeccionId`, `findByUsuarioId`, `existsByUsuarioIdAndSeccionId` y `deleteAllBySeccionId`. El método de borrado se integra al flujo de eliminación de sección (ADMIN) para evitar dejar referencias colgantes.
- **Eliminación segura de secciones por DOCENTE titular**: Nuevo endpoint `DELETE /api/secciones/{id}/docente` (`@PreAuthorize("hasRole('DOCENTE')")`) que solo el titular (`secciones.docente_id = id usuario`) puede invocar. La operación rechaza con 400 si la sección tiene matrículas, evaluaciones o evaluaciones por saber asociadas — esto preserva el histórico. Si hay datos, solo ADMIN puede borrar con cascada vía `DELETE /api/secciones/{id}`. El método `SeccionServiceImpl.eliminarComoDocente` valida titularidad y dependencias antes de borrar las asignaciones M:N y la sección.

---

## Development Rules

### Layer Boundaries

**Controllers must only:**
- Receive requests, delegate to a service, and return a response
- Declare `@Valid` on request body parameters
- Map service results to `ResponseEntity<ApiResponse<T>>`

**Controllers must never:**
- Contain `if/else` business logic, calculations, or data transformations
- Call repositories directly
- Return entity objects or expose internal model types

**Services own all business logic.** Validation of business rules (e.g. "a student cannot have two active enrollments") belongs in the service layer, not the controller and not the repository.

### DTOs — Mandatory

- **Never return or accept a JPA entity in a controller method.** All controller inputs and outputs must be DTOs.
- Place DTOs under `dto/<domain>/` (e.g. `dto/estudiante/EstudianteRequestDto.java`, `dto/estudiante/EstudianteResponseDto.java`).
- Entity-to-DTO and DTO-to-entity mapping is done in the service layer.
- DTOs use Lombok (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`).

### Validation

- Use Jakarta Bean Validation annotations (`@NotNull`, `@NotBlank`, `@Size`, `@Min`, `@Max`, `@Email`, etc.) on DTO fields.
- Annotate controller method parameters with `@Valid` to trigger validation.
- Never perform manual null-checks or format checks in controllers or services when a Jakarta annotation covers the case.
- `GlobalExceptionHandler` must handle `MethodArgumentNotValidException` and return structured field-level errors (not yet implemented — add it when needed).

### API Response Structure

All endpoints must return `ResponseEntity<ApiResponse<T>>`. The `ApiResponse` wrapper must be consistent:

```json
{
  "success": true,
  "message": "Descripción breve",
  "data": { ... }
}
```

For errors:
```json
{
  "success": false,
  "message": "Descripción del error",
  "data": null
}
```

Never return raw objects, plain strings, or unwrapped lists directly from a controller.

### Error Handling

- All exception handling goes through `GlobalExceptionHandler` — do not add `try/catch` blocks in controllers.
- Use specific custom exceptions (e.g. `RecursoNoEncontradoException`, `ReglaDeNegocioException`) thrown from the service layer; let `GlobalExceptionHandler` map them to HTTP status codes.
- `404 Not Found` — resource does not exist
- `400 Bad Request` — invalid input or violated business rule
- `409 Conflict` — duplicate or constraint violation
- `500 Internal Server Error` — unexpected failure; never expose stack traces or internal messages to the client

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Classes | `PascalCase` | `EstudianteServiceImpl` |
| Methods / variables | `camelCase` | `obtenerEstudiantePorId` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_INTENTOS_LOGIN` |
| Database columns | `snake_case` | `fecha_nacimiento` |
| DTO suffix | `RequestDto` / `ResponseDto` | `MatriculaRequestDto` |
| Service interface | no suffix | `EstudianteService` |
| Service implementation | `Impl` suffix | `EstudianteServiceImpl` |
| REST paths | `kebab-case`, plural nouns | `/api/estudiantes`, `/api/anios-lectivos` |

### Flyway Migrations

**Do not modify existing migration files** (`V1__`, `V2__`, `V3__`) under any circumstances — Flyway checksums will fail and the application will not start. To change the schema, always create a new versioned migration file (`V4__description.sql`, etc.). Only modify existing migrations if the user explicitly requests it and the database has been wiped.

### Security

- Never log passwords, tokens, or personally identifiable information (PII such as `cedula`, full names combined with grades).
- JWT tokens (when implemented) must be validated in a filter, never in a controller or service.
- Do not expose internal IDs or sequences in error messages.
- Passwords must be hashed with `BCryptPasswordEncoder` (strength 12); never store or compare plain text.
- Sanitize all user-supplied strings before using them in JPQL or native queries; prefer Spring Data method naming or `@Query` with named parameters over string concatenation.
