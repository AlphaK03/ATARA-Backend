-- =====================================================================
-- V4: Una matrícula ACTIVO por estudiante y año lectivo
-- =====================================================================
-- Problema: el esquema solo tenía UNIQUE (estudiante_id, seccion_id), que
-- evita duplicar al estudiante en la MISMA sección pero permite que esté en
-- varias secciones del mismo año (incluso en centros distintos). Esto no
-- corresponde a la realidad: un estudiante pertenece a una sola sección por
-- ciclo. La validación de servicio (SeccionServiceImpl) ya rechaza el caso;
-- este índice lo garantiza también a nivel de datos.
--
-- Paso 1 — Limpieza de duplicados existentes: por cada (estudiante, año) con
-- varias matrículas ACTIVO se conserva la más reciente (por fecha_matricula y,
-- en empate, mayor id) y el resto pasa a RETIRADO. No se borran filas para
-- preservar el histórico.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY estudiante_id, anio_lectivo_id
               ORDER BY fecha_matricula DESC, id DESC
           ) AS rn
    FROM public.matriculas
    WHERE estado = 'ACTIVO'
)
UPDATE public.matriculas m
SET estado = 'RETIRADO'
FROM ranked r
WHERE m.id = r.id
  AND r.rn > 1;

-- Paso 2 — Índice único parcial: a lo sumo una matrícula ACTIVO por estudiante
-- y año lectivo. Las RETIRADO no cuentan, de modo que un traslado (RETIRADO en
-- una sección + ACTIVO en otra) sigue siendo posible.
CREATE UNIQUE INDEX uq_estudiante_anio_activo
    ON public.matriculas (estudiante_id, anio_lectivo_id)
    WHERE estado = 'ACTIVO';

COMMENT ON INDEX public.uq_estudiante_anio_activo IS
    'Garantiza la regla de negocio: un estudiante solo puede tener una matrícula ACTIVO por año lectivo (una sección por ciclo). Parcial sobre estado=ACTIVO para permitir traslados via RETIRADO.';
