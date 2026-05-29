-- ============================================================================
-- V23: Permitir que un estudiante pertenezca a varias secciones en el mismo año
-- ============================================================================
-- Contexto:
--   El diseño original imponía "un estudiante = una sección por año" mediante
--   UNIQUE (estudiante_id, anio_lectivo_id). En la práctica cada docente crea su
--   propia sección por materia (Español, Matemáticas, Ciencias, Estudios
--   Sociales...), por lo que un mismo estudiante debe poder estar matriculado en
--   las secciones de varios docentes dentro del mismo año lectivo.
--
-- Cambio:
--   - Se elimina el UNIQUE por año (uq_estudiante_por_anio).
--   - Se agrega UNIQUE (estudiante_id, seccion_id) para conservar integridad:
--     un estudiante no puede quedar matriculado dos veces en LA MISMA sección,
--     pero sí en cuantas secciones distintas del año sea necesario.
--
-- Seguridad de datos:
--   La restricción nueva es más laxa que la anterior; los datos existentes
--   (a lo sumo una matrícula por estudiante/año) la cumplen trivialmente.
-- ============================================================================

ALTER TABLE matriculas
    DROP CONSTRAINT IF EXISTS uq_estudiante_por_anio;

ALTER TABLE matriculas
    ADD CONSTRAINT uq_estudiante_por_seccion UNIQUE (estudiante_id, seccion_id);

COMMENT ON TABLE matriculas IS
    'Historial de asignación estudiante↔sección por año lectivo. Un estudiante '
    'puede pertenecer a varias secciones en el mismo año (una por docente/materia). '
    'UNIQUE (estudiante_id, seccion_id) evita matrículas duplicadas en una misma sección.';

COMMENT ON COLUMN matriculas.anio_lectivo_id IS
    'Denormalizado desde secciones.anio_lectivo_id para consultar e indexar matrículas por año.';
