-- ============================================================================
-- V21: Eliminar la materia "Educación Física" y todas sus dependencias
--
-- Motivo: la materia se sembró desde V2 (sample data) pero ATARA no la evalúa
--         por saber, no la usa el wizard de evaluación y no debe ofrecerse en
--         ningún catálogo del frontend. Se decide retirarla por completo del
--         sistema en lugar de seguir filtrándola cliente-side en varias páginas.
--
-- Estrategia: los FK de `materias` son ON DELETE RESTRICT en su mayoría, así
--             que esta migración limpia manualmente las cadenas de dependencias
--             en el orden inverso al de creación. Las operaciones están
--             envueltas en un bloque DO para resolver primero el id de la
--             materia y abortar silenciosamente si no existe (BD recién
--             creada por alguien antes de aplicar esta migración, o aplicada
--             dos veces accidentalmente).
--
-- Tablas tocadas (orden de borrado):
--   1. detalle_evaluacion_saber      (ON DELETE CASCADE de evaluaciones_saber,
--                                     pero limpiamos por seguridad)
--   2. evaluaciones_saber            (materia_id RESTRICT)
--   3. alertas_tematicas             (materia_id RESTRICT)
--   4. ejes_tematicos_niveles        (cascada vía ejes_tematicos)
--   5. ejes_tematicos                (materia_id RESTRICT)
--   6. detalle_evaluacion            (cascade desde evaluaciones, pero los
--                                     criterios apuntan a contenidos que
--                                     vamos a borrar — limpiar manual)
--   7. alertas                       (contenido_id RESTRICT)
--   8. criterios_indicadores         (contenido_id RESTRICT)
--   9. contenidos                    (materia_id RESTRICT)
--  10. usuario_materias              (cascade — pero por orden lógico lo
--                                     adelantamos antes del DELETE de materia)
--  11. materias                      (la fila objetivo)
-- ============================================================================

DO $$
DECLARE
    v_materia_id INTEGER;
BEGIN
    -- Resolver id por clave (V6 garantiza la columna `clave`). Si la materia
    -- ya no existe (BD limpia o migración ya aplicada por otra ruta), salimos.
    SELECT id
      INTO v_materia_id
      FROM materias
     WHERE clave = 'EDUCACION_FISICA';

    IF v_materia_id IS NULL THEN
        RAISE NOTICE 'V21: la materia EDUCACION_FISICA no existe, nada que hacer';
        RETURN;
    END IF;

    -- 1) Detalle de evaluaciones por saber cuyo eje pertenece a Educación Física.
    --    (Las cabeceras evaluaciones_saber con materia_id de EF caen en el paso 2;
    --     este DELETE cubre el caso defensivo donde el eje sea de EF pero la
     --    cabecera no — no debería darse, pero limpiamos por completitud.)
    DELETE FROM detalle_evaluacion_saber
     WHERE eje_tematico_id IN (
         SELECT id FROM ejes_tematicos WHERE materia_id = v_materia_id
     );

    -- 2) Evaluaciones por saber con materia = Educación Física. El detalle
    --    cae en cascada (FK CASCADE en V4).
    DELETE FROM evaluaciones_saber WHERE materia_id = v_materia_id;

    -- 3) Alertas temáticas (vista desnormalizada por materia).
    DELETE FROM alertas_tematicas WHERE materia_id = v_materia_id;

    -- 4) Asignaciones de ejes a niveles (cascade desde ejes_tematicos según V12,
    --    pero lo hacemos explícito para no depender del orden).
    DELETE FROM ejes_tematicos_niveles
     WHERE eje_tematico_id IN (
         SELECT id FROM ejes_tematicos WHERE materia_id = v_materia_id
     );

    -- 5) Ejes temáticos de la materia.
    DELETE FROM ejes_tematicos WHERE materia_id = v_materia_id;

    -- 6) Detalle de evaluaciones (modelo viejo) cuyos criterios pertenecen a
    --    contenidos de Educación Física.
    DELETE FROM detalle_evaluacion
     WHERE criterio_id IN (
         SELECT ci.id
           FROM criterios_indicadores ci
           JOIN contenidos c ON c.id = ci.contenido_id
          WHERE c.materia_id = v_materia_id
     );

    -- 7) Alertas (modelo viejo) ligadas a contenidos de Educación Física.
    DELETE FROM alertas
     WHERE contenido_id IN (
         SELECT id FROM contenidos WHERE materia_id = v_materia_id
     );

    -- 8) Criterios de los contenidos de Educación Física.
    DELETE FROM criterios_indicadores
     WHERE contenido_id IN (
         SELECT id FROM contenidos WHERE materia_id = v_materia_id
     );

    -- 9) Contenidos de la materia.
    DELETE FROM contenidos WHERE materia_id = v_materia_id;

    -- 10) Asignaciones docente ↔ materia (es ON DELETE CASCADE en V8, pero
    --     lo hacemos manual antes para que el borrado de la fila materia
    --     sea limpio aunque alguien cambie el FK en el futuro).
    DELETE FROM usuario_materias WHERE materia_id = v_materia_id;

    -- 11) Finalmente, la materia.
    DELETE FROM materias WHERE id = v_materia_id;

    RAISE NOTICE 'V21: Educación Física (id=%) eliminada junto con sus dependencias', v_materia_id;
END $$;
