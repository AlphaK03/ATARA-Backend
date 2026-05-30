-- =============================================================================
-- V26 — Base limpia: un único usuario ADMIN y sin datos demo
-- =============================================================================
-- Objetivo solicitado:
--   1. Que solo quede UN usuario, rol ADMIN, correo 'ataranotificaciones@gmail.com'
--      y contraseña temporal 'Admin1234!' (debe_cambiar_password = TRUE → el backend
--      obliga a cambiarla en el primer login, bloqueando todo salvo /api/auth/*).
--   2. Eliminar las secciones huérfanas (todas quedan sin docente al borrar los
--      usuarios) y el resto de datos demo: estudiantes, alertas, matrículas y
--      evaluaciones de muestra.
--
-- SE CONSERVAN (catálogos/referencia): centros educativos, niveles, materias,
-- tipos de saber, ejes temáticos, niveles de desempeño, dimensiones, contenidos,
-- criterios, escala de valoración, años lectivos y periodos.
--
-- ┌───────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  OPERACIÓN DESTRUCTIVA E IRREVERSIBLE                                     │
-- │ Vacía por completo los datos académicos transaccionales (estudiantes,        │
-- │ secciones, matrículas, evaluaciones, alertas). Aplíquela solo en una base    │
-- │ de desarrollo/demo o tras hacer respaldo. Una vez aplicada, Flyway fija su    │
-- │ checksum y no se puede modificar.                                            │
-- └───────────────────────────────────────────────────────────────────────────┘

-- 1) Asegurar el admin objetivo (upsert por correo) ANTES de borrar, para que el
--    superviviente exista siempre. El hash corresponde a 'Admin1234!' (BCrypt).
INSERT INTO usuarios (nombre, apellidos, correo, password, rol_id, estado, email_verificado, debe_cambiar_password)
VALUES (
    'Administrador', 'ATARA',
    'ataranotificaciones@gmail.com',
    '$2a$10$F1U30x64ierJnoOw7Dx8MuaqkbgIVzfdrZ38.uQRGz24uivyd96dm',
    (SELECT id FROM roles WHERE nombre = 'ADMIN'),
    'ACTIVO', TRUE, TRUE
)
ON CONFLICT (correo) DO UPDATE
   SET password              = EXCLUDED.password,
       rol_id                = EXCLUDED.rol_id,
       estado                = 'ACTIVO',
       email_verificado      = TRUE,
       debe_cambiar_password = TRUE;

-- Borrado en orden FK-seguro (de las hojas hacia las raíces). Los detalles de
-- evaluación cascadean desde su evaluación; usuarios_secciones cascadea desde
-- secciones; usuario_materias / tokens cascadean desde usuarios.

-- 2) Alertas (hojas: referencian estudiante/evaluación pero nada las referencia).
DELETE FROM alertas;
DELETE FROM alertas_tematicas;

-- 3) Evaluaciones por saber y evaluaciones (cascadean sus detalles).
DELETE FROM evaluaciones_saber;
DELETE FROM evaluaciones;

-- 4) Matrículas (liberan estudiantes y secciones, que las referencian con RESTRICT).
DELETE FROM matriculas;

-- 5) Secciones (cascadea usuarios_secciones). Tras esto no quedan secciones huérfanas
--    porque no queda ninguna sección.
DELETE FROM secciones;

-- 6) Usuarios excepto el admin objetivo (cascadea usuario_materias, tokens_refresh,
--    email_tokens; ya no hay evaluaciones que lo bloqueen).
DELETE FROM usuarios
 WHERE correo <> 'ataranotificaciones@gmail.com';

-- 7) Estudiantes (ya no los referencia ninguna tabla).
DELETE FROM estudiantes;
