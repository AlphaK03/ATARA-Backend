# ATARA — Backend

API REST del Sistema de Alerta Temprana y Atención al Rendimiento Académico.  
Diseñado para instituciones de educación primaria (1°–6°) del MEP de Costa Rica.

**Repositorio del frontend:** [AlphaK03/atara-frontend](https://github.com/AlphaK03/atara-frontend)

---

## Stack tecnológico

| Capa          | Tecnología                        |
|---------------|-----------------------------------|
| Backend       | Java 17 + Spring Boot 4.0.3       |
| ORM           | Spring Data JPA (Hibernate)       |
| Seguridad     | Spring Security + JWT             |
| Base de datos | PostgreSQL 15+                    |
| Migraciones   | Flyway                            |
| Build         | Maven (wrapper incluido)          |
| Utilidades    | Lombok, Jakarta Validation        |

---

## Requisitos

- Java 17+
- Docker Desktop (para levantar PostgreSQL)
- Maven (o usar `./mvnw` incluido)

---

## Cómo encender el sistema

### 1. Levantar la base de datos

```bash
docker-compose up -d
```

Esto inicia PostgreSQL en el **puerto 5433** (no 5432 — el 5432 queda libre para instalaciones locales).  
Usuario: `atara_user` · Contraseña: `atara_pass_123` · Base de datos: `atara_db`

Verificar que el contenedor esté corriendo:

```bash
docker ps
```

### 2. Ejecutar el backend

```bash
./mvnw spring-boot:run
```

El servidor arranca en **http://localhost:8081**.  
Flyway aplica automáticamente las migraciones al iniciar — no se necesita ejecutar SQL manualmente.

Verificar que esté vivo:

```
GET http://localhost:8081/actuator/health
```

### 3. (Opcional) Levantar el frontend

```bash
# En el repo atara-frontend
npm install
npm run dev
```

Frontend disponible en **http://localhost:3000** — hace proxy de `/api/*` al backend automáticamente.

---

## Comandos útiles

```bash
# Detener la base de datos
docker-compose down

# Build del proyecto
./mvnw clean package

# Ejecutar todos los tests
./mvnw test

# Ejecutar un test específico
./mvnw test -Dtest=NombreClase
./mvnw test -Dtest=NombreClase#nombreMetodo

# Ver logs de PostgreSQL
docker logs atara-db
```

---

## Arquitectura

```
com.atara.deb.ataraapi/
├── controller/    REST endpoints (/api/*)
├── service/       Interfaces + impl/ con las implementaciones
├── repository/    Spring Data JPA (extienden JpaRepository<Entity, Long>)
├── model/         Entidades JPA + enums/
├── dto/           DTOs organizados por dominio (alerta/, estudiante/, etc.)
├── exception/     GlobalExceptionHandler + excepciones personalizadas
└── security/      SecurityConfig, JwtService, JwtAuthenticationFilter
```

Flujo estándar: `Controller → Service → Repository → Model`

---

## Base de datos

Schema 100% administrado por **Flyway** — `ddl-auto=none`. Nunca dejar que Hibernate gestione el schema.

Migraciones en `src/main/resources/db/migration/`:

| Versión | Descripción |
|---------|-------------|
| V1 | 20 tablas, 40+ índices, 13 triggers de auditoría |
| V2 | Datos de muestra (seed) — usuarios, centros, secciones, estudiantes |
| V3 | 8 vistas SQL de reportes |
| V4 | Evaluaciones por saber + alertas temáticas (6 tablas, 2 vistas) |
| V5 | Estudiantes de muestra adicionales |
| V6 | Separación de ejes temáticos por materia (84 ejes: 21 × 4 materias) |
| V7 | Unique constraint en alertas_tematicas por materia |
| V8 | Tabla M:N `usuarios_materias` para acceso de docentes |
| V9 | Usuario docente de prueba (keylor) |
| V10 | Datos para docente avargas (Español/Ciencias) |
| V11 | Corrección de asignación de docente en sección |
| V12 | Tabla M:N `ejes_tematicos_niveles` — ejes por grado según currículo MEP |
| V13 | Refinamiento de V12: restricciones específicas por grado en todas las materias |
| V14 | Sistema de verificación de email y reset de contraseña |
| V15 | Protección brute-force en reset (contador `intentos_fallidos`) |

---

## Autenticación

Todos los endpoints requieren JWT excepto `/api/auth/*` y `/actuator/health`.

Credenciales de prueba (seed en V2 — requieren regenerar hash BCrypt):

```java
// Generar hash para pruebas
String hash = new BCryptPasswordEncoder(12).encode("Password123!");
```

```sql
UPDATE usuarios SET password = '<hash_generado>'
WHERE correo IN (
    'admin@atara.mep.go.cr',
    'mgarcia@atara.mep.go.cr',
    'jperez@atara.mep.go.cr',
    'avargas@atara.mep.go.cr'
);
```

---

## Jerarquía de datos

```
Centro Educativo
  └── Sección (nivel + año lectivo + nombre)
        ├── Periodo (I, II, III trimestre)
        └── Estudiante
              └── Evaluación (cabecera por periodo)
                    └── DetalleEvaluacion (por criterio)
```

---

## Puertos

| Servicio   | Puerto |
|------------|--------|
| Backend    | 8081   |
| PostgreSQL | 5433   |
| Frontend   | 3000   |

---

*ATARA — MEP Costa Rica · 2026*
