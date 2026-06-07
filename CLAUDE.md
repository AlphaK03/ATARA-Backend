# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ATARA (Sistema de Alerta Temprana y Atención al Rendimiento Académico) is a Spring Boot REST API backend for an early-alert academic system designed for Costa Rica's Ministry of Public Education (MEP). It tracks student performance across 6 grade levels using a 4-point Likert scale across 5 evaluation dimensions.

**Stack:** Spring Boot 4.0.3, Java 17, PostgreSQL, Flyway, Lombok, Jakarta Validation.

**Frontend:** Repositorio separado — [AlphaK03/atara-frontend](https://github.com/AlphaK03/atara-frontend). Vite + Vanilla JS SPA. Corre en `localhost:3000` y hace proxy de `/api/*` al backend en `localhost:8081`.

## Required Skills

Before starting work on this project, verify these skills are installed (they live in `.agents/skills/` symlinked to Claude Code):

```bash
ls .agents/skills/
```

| Skill | Source | Comando |
|---|---|---|
| `frontend-design` | `anthropics/skills` | `npx skills add https://github.com/anthropics/skills --skill frontend-design` |
| `superpowers` (14 skills) | `obra/superpowers` | `npx skills add https://github.com/obra/superpowers` |
| Trail of Bits security (74 skills) | `trailofbits/skills` | `npx skills add https://github.com/trailofbits/skills` |
| `gstack` | `garrytan/gstack` | `npx skills add https://github.com/garrytan/gstack` |
| `claude-mem` | `thedotmack/claude-mem` | `npx claude-mem install` + `npx claude-mem start` |

**Notas:**
- `claude-mem` requiere levantar el worker manualmente en cada máquina nueva: `npx claude-mem start`
- `gstack` tiene alertas de seguridad altas (27 alertas Socket) — es el skill de QA headless de Garry Tan, usarlo con precaución
- Reiniciar Claude Code tras instalar cualquier skill para que se cargue en sesión

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
├── model/            JPA entities + enums/ subdirectory
├── dto/              Request/Response DTOs organized by domain (alerta/, estudiante/, etc.)
├── exception/        GlobalExceptionHandler + AccesoDenegadoException, TokenRefreshException
└── security/         SecurityConfig, JwtService, JwtAuthenticationFilter, UserDetailsServiceImpl
                      ContextoUsuario, ContextoUsuarioService, UsuarioPrincipal
```

**Database schema is owned by Flyway** — `ddl-auto=none`, never let Hibernate manage schema. Migrations live in `src/main/resources/db/migration/`:
- `V1__init_schema.sql` — consolidated dump of original V1–V26: full schema (tables, indexes, FK, constraints, triggers, functions, views, seed data). **This is a pg_dump snapshot — do not apply on a DB that already ran the original migrations.**
- `V2__datos_base.sql` — base seed data (roles, escalas, dimensiones, etc.)
- `V3__centros_educativos.sql` — seed data for educational centers
- `V16__matricula_unica_por_anio.sql` — partial unique index `uq_estudiante_anio_activo` on `matriculas(estudiante_id, anio_lectivo_id) WHERE estado = 'ACTIVO'`; enforces one active enrollment per student per academic year at the DB level

**Audit trail** is handled entirely at the database level via the `registro_auditoria` table (JSONB) and `fn_actualizar_updated_at` triggers — no application-level audit code needed.

## Key Domain Concepts

- **Escala de valoración (original)**: 4-point scale — Insuficiente (1), Básico (2), Satisfactorio (3), Destacado (4)
- **Escala de desempeño por saberes**: 5-point scale — Inicial (1), En desarrollo (2), Intermedio (3), Logrado (4), Avanzado (5)
- **Dimensiones de evaluación**: 5 dimensions including Rendimiento Académico, Participación, Hábitos de Estudio, Factores Socioemocionales
- **Tipos de saber**: Conceptual, Procedimental, Actitudinal — each with 7 ejes temáticos per materia
- **Ejes por nivel**: cada eje se asocia a uno o más grados vía `ejes_tematicos_niveles`. Ejemplos: "Álgebra y patrones" (Matemáticas) → 4°–6°; "Fracciones, decimales y porcentajes" → 3°–6°. El wizard de evaluación usa este filtro.
- **Structure hierarchy**: Centro Educativo → Sección → Periodo → Evaluacion → DetalleEvaluacion
- **Evaluaciones por saber**: EvaluacionSaber → DetalleEvaluacionSaber (multiple per student/period/tipo_saber)
- **Alertas temáticas**: Generated from averages per eje temático — ALTA (≤2.0), MEDIA (2.1–3.0), SIN_ALERTA (>3.0)
- **Unique constraint on evaluaciones**: `(estudiante_id, usuario_id, periodo_id)` — enforced at DB level
- **One active enrollment per year**: `uq_estudiante_anio_activo` — a student can only have one ACTIVO matricula per anio_lectivo

## Current Endpoint Map

| Controller | Method | Path |
|---|---|---|
| **AuthController** | POST | `/api/auth/login` |
| | POST | `/api/auth/refresh` |
| | POST | `/api/auth/logout` |
| | GET | `/api/auth/me` |
| | POST | `/api/auth/registro` (self-registration, institutional domain only) |
| | POST | `/api/auth/password-reset/solicitar` |
| | POST | `/api/auth/password-reset/confirmar` |
| | GET | `/api/auth/email/verificar?token=` |
| | PUT | `/api/auth/cambiar-password` |
| | PUT | `/api/auth/mis-materias` |
| **AdminController** | GET | `/api/admin/usuarios` (solo ADMIN) |
| | POST | `/api/admin/usuarios` (solo ADMIN) |
| | PUT | `/api/admin/usuarios/{id}` (solo ADMIN) |
| | DELETE | `/api/admin/usuarios/{id}` (solo ADMIN) |
| | PATCH | `/api/admin/usuarios/{id}/estado` (alterna ACTIVO ↔ INACTIVO) |
| | GET | `/api/admin/test-mail` (envía correo de prueba al admin autenticado) |
| | GET | `/api/admin/centros` (solo ADMIN) |
| | GET | `/api/admin/centros/{id}` (solo ADMIN) |
| | POST | `/api/admin/centros` (solo ADMIN) |
| | PUT | `/api/admin/centros/{id}` (solo ADMIN) |
| **PiadController** | POST | `/api/piad/extraer` (multipart PDF → OCR → List<EstudiantePIADDto>) |
| | POST | `/api/piad/importar` (bulk import + enroll students from reviewed PIAD list) |
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
| | GET | `/api/catalogos/saberes/ejes?nivelId=&materiaId=&tipoSaberId=` |
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
| | GET | `/api/secciones/catalogos/estudiantes?anioLectivoId=&seccionId=` |
| PeriodoController | POST | `/api/periodos` |
| | GET | `/api/periodos?anioLectivoId=` |
| | GET | `/api/periodos/activo?anioLectivoId=` |
| | PUT | `/api/periodos/{id}` |
| | PUT | `/api/periodos/{id}/activar` |
| | DELETE | `/api/periodos/{id}` |

All endpoints require JWT Bearer token except `/api/auth/*` and `GET /actuator/health`.

## Configuration Notes

All secrets are externalized as environment variables — no defaults for production-critical values:

| Variable | Default | Notes |
|---|---|---|
| `PGHOST` | `localhost` | |
| `PGPORT` | `5433` | Non-standard — Docker maps 5432→5433 |
| `PGDATABASE` | `atara_db` | |
| `PGUSER` | `atara_user` | |
| `PGPASSWORD` | *(none)* | Required; set in `application-local.properties` for dev |
| `JWT_SECRET` | *(ephemeral)* | If unset, JwtService generates a random key per boot (tokens don't survive restarts) |
| `JWT_EXPIRATION_MS` | `1800000` | 30 min access token |
| `JWT_REFRESH_EXPIRATION_DAYS` | `7` | |
| `BREVO_API_KEY` | *(none)* | Required for email; Brevo panel → Configuración → Claves API |
| `BREVO_FROM_EMAIL` | `ataranotificaciones@gmail.com` | Must be a verified sender in Brevo |
| `FRONTEND_URL` | `http://localhost:3000` | Used in email verification links |
| `PIAD_TESSDATA_DIR` | `scripts/extractor-piad/tessdata` | Must contain `spa.traineddata` |
| `CORS_ALLOWED_ORIGINS` | `*` | In production, set to the exact frontend domain |
| `PORT` | `8081` | Railway sets this automatically |
| `SHOW_SQL` | `false` | Set to `true` in dev to log Hibernate SQL (includes PII — never in prod) |
| `MAX_FILE_SIZE` | `25MB` | Multipart limit for PIAD PDF uploads |
| `LOG_LEVEL_SECURITY` | `INFO` | Set to `DEBUG` to trace JWT auth failures |

Local dev secrets go in `application-local.properties` (gitignored). See `application-local.properties.example`.

- All JPA relationships use `FetchType.LAZY` — be mindful of N+1 query risks when adding new queries
- BCrypt password hashes in seed data are placeholders; regenerate with `new BCryptPasswordEncoder(12).encode("...")` to test auth flows

## Implementation Status

**Not yet implemented** (aspirational in design rules):
- **Custom exceptions** (`RecursoNoEncontradoException`, `ReglaDeNegocioException`) do not exist. `GlobalExceptionHandler` maps `IllegalArgumentException → 400`, `NoSuchElementException → 404`, `UnsupportedOperationException → 501`, `RuntimeException → 500`. `AccesoDenegadoException` and `TokenRefreshException` do exist. When adding new features, throw `IllegalArgumentException` (400) or `NoSuchElementException` (404) from the service layer.
- **`ApiResponse<T>` wrapper** is not implemented. Controllers return DTOs directly (success path). Error responses from `GlobalExceptionHandler` have shape `{timestamp, status, error, message, path}`. The `{success, message, data}` format in the Dev Rules below is aspirational — do not mix both shapes.

**Implemented:**
- **Spring Security / JWT**: `SecurityConfig`, `JwtService`, `JwtAuthenticationFilter`, `UserDetailsServiceImpl`, full `AuthController`. Refresh token rotation. `ContextoUsuario`/`ContextoUsuarioService` helpers to read the authenticated user in service layer.
- **Email via Brevo**: `EmailServiceImpl` uses Brevo HTTP API (not SMTP) to avoid cloud blocking. `EmailTokenServiceImpl` handles email verification (UUID token) and password reset (4-digit code, 5-attempt brute-force lockout).
- **PIAD OCR**: `PiadServiceImpl` uses Tesseract to extract student data from MEP "Lista PIAD" PDFs. `ImportacionPiadServiceImpl` + `ImportacionPiadFilaProcessor` handle bulk import: idempotent (reuses existing students, skips already-enrolled).
- **Admin user management**: `AdminController`/`AdminServiceImpl` for CRUD on users under `/api/admin/usuarios`.
- **Auto-creation of periods**: Creating an `AnioLectivo` auto-generates 3 trimestres dividing the date range equally; I Trimestre is active by default.
- **Role-filtered section visibility**: `GET /api/secciones` returns all sections to ADMIN, only owned/co-teacher sections to DOCENTE.
- **Ejes filtrados por grado**: `GET /api/catalogos/saberes/ejes?nivelId=` filters by `ejes_tematicos_niveles` M:N table matching MEP curriculum.

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
- `GlobalExceptionHandler` handles `MethodArgumentNotValidException` and returns all field errors joined as a single string in the `message` field.

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

**Do not modify existing migration files** — Flyway checksums will fail and the application will not start. To change the schema, always create a new versioned migration file (next available `VN__description.sql`). Only modify existing migrations if the database has been wiped.

The current migrations are a consolidated format: V1 is a full `pg_dump` snapshot (not incremental), V2/V3 are seed data, V16 adds a business-rule constraint. New migrations continue from V17 onward.

### Security

- Never log passwords, tokens, or personally identifiable information (PII such as `cedula`, full names combined with grades).
- JWT tokens are validated in `JwtAuthenticationFilter`, never in a controller or service.
- Do not expose internal IDs or sequences in error messages.
- Passwords must be hashed with `BCryptPasswordEncoder` (strength 12); never store or compare plain text.
- Sanitize all user-supplied strings before using them in JPQL or native queries; prefer Spring Data method naming or `@Query` with named parameters over string concatenation.
