-- =============================================================================
-- V17: Ejes temáticos de CIENCIAS alineados al currículo MEP CR (orden PDF)
--
-- Cambio principal:
--   Hasta V12/V13, Ciencias tenía 21 ejes genéricos (CC_SERES_VIVOS, CC_CUERPO,
--   etc.) que aplicaban a todos los grados sin distinción de trimestre. Esto
--   no reflejaba la progresión secuencial del Programa de Estudio MEP, donde
--   cada año tiene contenidos específicos para cada uno de los 3 trimestres.
--
-- Solución:
--   1. Se añade la columna `periodo_numero` (SMALLINT NULL) en ejes_tematicos.
--      - NULL  → eje aplicable a cualquier trimestre (caso Español/Mate/Soc).
--      - 1/2/3 → eje vinculado a un trimestre específico (caso Ciencias).
--   2. Se ELIMINAN los 21 ejes genéricos previos de Ciencias.
--   3. Se INSERTAN 198 ejes nuevos para Ciencias, distribuidos así:
--        6 grados (1°-6°) × 3 trimestres × 11 ejes = 198
--      Cada eje proviene de un criterio de evaluación del Programa MEP
--      "Ciencias I y II ciclo 2018" en su orden de aparición en el PDF.
--   4. Se vincula cada eje a su grado correspondiente vía ejes_tematicos_niveles.
--   5. Se actualiza la vista vw_ejes_por_materia_nivel para incluir periodo_numero.
--
-- Clasificación tipo_saber (basada en verbo de inicio):
--   - Conceptual (saber qué)   : Reconocer, Identificar, Describir, Comprender, ...
--   - Procedimental (saber hacer): Aplicar, Construir, Analizar, Relacionar, ...
--   - Actitudinal (saber ser)  : Valorar, Apreciar, Tomar conciencia, Justificar, ...
--
-- Convención de clave: CIE_G{grado}_T{trimestre}_{pos:02d}
--   Ejemplo: CIE_G1_T1_01 = Ciencias, 1° grado, Trimestre I, posición 1
--
-- Filtrado esperado en el wizard de evaluación:
--   SELECT * FROM ejes_tematicos e
--   JOIN ejes_tematicos_niveles en ON en.eje_tematico_id = e.id
--   WHERE e.materia_id = (SELECT id FROM materias WHERE clave='CIENCIAS')
--     AND en.nivel_id = :grade_nivel_id
--     AND (e.periodo_numero = :trimestre OR e.periodo_numero IS NULL)
--   ORDER BY e.tipo_saber_id, e.orden;
-- =============================================================================

-- ============================================================================
-- 1) Columna periodo_numero (nullable, no rompe ejes existentes)
-- ============================================================================
ALTER TABLE ejes_tematicos
    ADD COLUMN IF NOT EXISTS periodo_numero SMALLINT NULL;

ALTER TABLE ejes_tematicos
    DROP CONSTRAINT IF EXISTS chk_ejes_tematicos_periodo;

ALTER TABLE ejes_tematicos
    ADD CONSTRAINT chk_ejes_tematicos_periodo
    CHECK (periodo_numero IS NULL OR periodo_numero BETWEEN 1 AND 3);

COMMENT ON COLUMN ejes_tematicos.periodo_numero IS
    'Trimestre asociado al eje (1, 2, 3). NULL = aplicable a cualquier trimestre.';

CREATE INDEX IF NOT EXISTS idx_ejes_periodo ON ejes_tematicos(periodo_numero);

-- Los nombres de los criterios MEP (Ciencias, Estudios Sociales, Matemática y
-- Español) son frases largas extraídas literalmente de los programas oficiales
-- y exceden los 150 caracteres originales. Se amplía a 500.
-- Las vistas que proyectan el tipo de la columna se eliminan y recrean abajo.
DROP VIEW IF EXISTS vw_promedios_ejes_periodo CASCADE;
DROP VIEW IF EXISTS vw_ejes_por_materia_nivel CASCADE;

ALTER TABLE ejes_tematicos
    ALTER COLUMN nombre TYPE VARCHAR(500);

-- Recreación de vw_promedios_ejes_periodo (originalmente creada en V6).
-- vw_ejes_por_materia_nivel se recrea más abajo, después de poblar los datos.
CREATE VIEW vw_promedios_ejes_periodo AS
SELECT es.estudiante_id,
       es.periodo_id,
       es.materia_id,
       m.nombre AS materia_nombre,
       det.eje_tematico_id,
       ej.nombre AS eje_nombre,
       ej.tipo_saber_id,
       ts.nombre AS tipo_saber_nombre,
       count(det.id)            AS total_evaluaciones,
       round(avg(det.valor), 2) AS promedio,
       min(det.valor)           AS valor_minimo,
       max(det.valor)           AS valor_maximo
  FROM detalle_evaluacion_saber det
  JOIN evaluaciones_saber es ON es.id  = det.evaluacion_saber_id
  JOIN ejes_tematicos     ej ON ej.id  = det.eje_tematico_id
  JOIN tipos_saber        ts ON ts.id  = ej.tipo_saber_id
  JOIN materias           m  ON m.id   = es.materia_id
 GROUP BY es.estudiante_id, es.periodo_id, es.materia_id, m.nombre,
          det.eje_tematico_id, ej.nombre, ej.tipo_saber_id, ts.nombre;

-- ============================================================================
-- 2) Limpiar ejes anteriores de CIENCIAS (CC_*, CP_*, CA_*)
--    El cascade no aplica aquí porque algunas FKs no tienen ON DELETE CASCADE,
--    así que limpiamos en orden inverso de dependencias.
-- ============================================================================

-- 2a) Borrar detalles de evaluación que referencian ejes de Ciencias
DELETE FROM detalle_evaluacion_saber
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'CIENCIAS')
);

-- 2b) Borrar alertas temáticas de Ciencias
DELETE FROM alertas_tematicas
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'CIENCIAS')
);

-- 2c) Borrar relaciones eje ↔ nivel para Ciencias (V12 cascade ayudaría, pero
--     lo hacemos explícito por claridad)
DELETE FROM ejes_tematicos_niveles
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'CIENCIAS')
);

-- 2d) Borrar los 21 ejes genéricos antiguos
DELETE FROM ejes_tematicos
WHERE materia_id = (SELECT id FROM materias WHERE clave = 'CIENCIAS');

-- ============================================================================
-- 3) Insertar 198 ejes nuevos para CIENCIAS (orden MEP)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- GRADO 1° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 1° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_01', 'Cuerpo humano e identidad sexual', 'Reconocer características básicas del cuerpo humano y aspectos biológicos que determinan parte de la identidad sexual de la persona.', 1, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_02', 'Hábitos de higiene', 'Distinguir hábitos de higiene, alimentación, ejercicio y recreación, para el cuidado de la salud personal y comunitaria.', 2, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G1_T1_03', 'Actividades recreativas de la comunidad que promueven el cuidado de la salud', 'Apoyar las actividades recreativas de la comunidad que promueven el cuidado de la salud, así como la participación de todas las personas independientemente de las capacidades que poseen.', 1, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_04', 'Situaciones cotidianas que pueden afectar el bienestar personal y comunitario', 'Reconocer situaciones cotidianas que pueden afectar el bienestar personal y comunitario.', 3, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_05', 'Medidas preventivas contra las manifestaciones de violencia', 'Describir medidas preventivas contra las manifestaciones de violencia que perjudican la integridad física, espiritual, psicológica y sexual de las personas.', 4, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_06', 'Necesidad de denunciar toda manifestación de violencia', 'Comprender la necesidad de denunciar toda manifestación de violencia que se presente en la institución, hogar o comunidad.', 5, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_07', 'Características que diferencian los componentes vivos y no vivos del entorno', 'Distinguir las características que diferencian los componentes vivos y no vivos del entorno, con los cuales se interactúa diariamente.', 6, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_08', 'Relación indispensable entre los componentes vivos y no vivos', 'Describir la relación indispensable entre los componentes vivos y no vivos para el cuidado del ambiente.', 7, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G1_T1_09', 'Importancia del cuidado de los componentes del ambiente', 'Justificar la importancia del cuidado de los componentes del ambiente para proteger toda forma de vida.', 2, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_10', 'Funciones', 'Identificar las funciones que cumplen las principales partes de la planta y su relación con otros seres vivos del entorno.', 8, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T1_11', 'Algunas plantas en su comunidad', 'Reconocer algunas plantas en su comunidad, según el ambiente donde se desarrollan y el beneficio que ofrecen para el ser humano y otros seres vivos.', 9, 1);  -- C

-- 1° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G1_T2_01', 'Cuidado de la flora', 'Valorar el cuidado de la flora como parte del patrimonio natural de nuestro país y su importancia para el planeta.', 3, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T2_02', 'Algunas características de los animales presentes en la comunidad', 'Identificar algunas características de los animales presentes en la comunidad y su relación con otros seres vivos del entorno.', 10, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T2_03', 'Relación de los seres humanos con otros animales y los beneficios mutuos', 'Reconocer la relación de los seres humanos con otros animales y los beneficios mutuos que pueden obtener.', 11, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G1_T2_04', 'Cuidado de la fauna', 'Valorar el cuidado de la fauna como parte del patrimonio natural de nuestro país y su importancia para el planeta.', 4, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T2_05', 'Situaciones', 'Reconocer situaciones que afectan los componentes vivos y no vivos del ambiente y perjudican el bienestar de toda forma de vida.', 12, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T2_06', 'Acciones', 'Describir acciones que contribuyen a la solución de problemas ambientales presentes en la comunidad.', 13, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G1_T2_07', 'La necesidad de cuidar la flora y fauna', 'Tomar conciencia de la necesidad de cuidar la flora y fauna, mejorando las condiciones del entorno que promueven la calidad de vida.', 5, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T2_08', 'Diversidad de formas en que se presenta los objetos materiales', 'Reconocer la diversidad de formas en que se presenta los objetos materiales, que se utilizan en la vida diaria.', 14, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T2_09', 'Algunos fenómenos naturales y acciones humanas', 'Describir algunos fenómenos naturales y acciones humanas que permiten cambiar los materiales del entorno, así como para la elaboración de objetos útiles para el ser humano.', 15, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G1_T2_10', 'Uso adecuado de los materiales', 'Tomar conciencia del uso adecuado de los materiales del entorno para mantener y disfrutar de lugares limpios.', 6, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T2_11', 'Objetos materiales', 'Identificar objetos materiales, relacionados con la producción de luz y calor, en la vida diaria.', 16, 2);  -- C

-- 1° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T3_01', 'Uso del fuego como fuente de luz y calor en las actividades cotidianas', 'Distinguir el uso del fuego como fuente de luz y calor en las actividades cotidianas.', 17, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 2, 'CIE_G1_T3_02', 'Medidas de prevención de accidentes en relación con el uso del fuego', 'Practicar medidas de prevención de accidentes en relación con el uso del fuego, para proteger los componentes del ambiente.', 1, 3),  -- P
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T3_03', 'Efectos del Sol en diferentes materiales del entorno y en la vida diaria', 'Identificar los efectos del Sol en diferentes materiales del entorno y en la vida diaria.', 18, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T3_04', 'Ejemplos que ilustren el uso del Sol', 'Describir ejemplos que ilustren el uso del Sol, como fuente principal de luz y calor en actividades cotidianas.', 19, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T3_05', 'Poner en práctica acciones preventivas con respecto al uso de la luz y el calor ', 'Poner en práctica acciones preventivas con respecto al uso de la luz y el calor que provienen del Sol, para disfrutar de sus beneficios.', 20, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T3_06', 'Fenómenos meteorológicos y sus efectos en las condiciones del estado del tiempo', 'Describir fenómenos meteorológicos y sus efectos en las condiciones del estado del tiempo, según la región donde se ubica la comunidad.', 21, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T3_07', 'Condiciones o estado del tiempo y su influencia en las actividades cotidianas', 'Distinguir las condiciones o estado del tiempo y su influencia en las actividades cotidianas, que se realizan en la comunidad.', 22, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G1_T3_08', 'Información relacionada con los fenómenos naturales', 'Valorar la información relacionada con los fenómenos naturales, que influyen en el estado del tiempo, para prevenir situaciones que afecten nuestra vida diaria.', 7, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T3_09', 'Características de las estaciones seca', 'Identificar las características de las estaciones seca y lluviosa en Costa Rica y su impacto en la vida diaria.', 23, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G1_T3_10', 'Consecuencias de las estaciones seca y lluviosa en la comunidad y medidas', 'Describir consecuencias de las estaciones seca y lluviosa en la comunidad y medidas para prevenir situaciones de riesgo.', 24, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G1_T3_11', 'Las zonas propensas a deslizamientos o inundaciones en la comunidad', 'Tomar conciencia de las zonas propensas a deslizamientos o inundaciones en la comunidad, para evitar situaciones desfavorables.', 8, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 2° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 2° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T1_01', 'Cambios en las etapas del desarrollo humano después del nacimiento', 'Reconocer los cambios en las etapas del desarrollo humano después del nacimiento, como parte del cuidado de la salud.', 25, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T1_02', 'Influencia de las buenas relaciones humanas', 'Comprender la influencia de las buenas relaciones humanas, en los ámbitos familiar, escolar y comunal, para el cuidado de la salud.', 26, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T1_03', 'Condiciones para buenas relaciones en la comunidad', 'Apreciar las condiciones que permiten mantener las buenas relaciones entre personas de distintas edades, en la comunidad.', 9, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T1_04', 'Medidas', 'Identificar medidas para la prevención de accidentes y enfermedades y su importancia para el bienestar personal y comunitario.', 27, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T1_05', 'Soluciones', 'Describir soluciones para evitar las situaciones que pueden generar accidentes o causar enfermedades en la comunidad.', 28, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T1_06', 'Necesidad de mejorar su propio entorno para el cuidado de la salud', 'Valorar la necesidad de mejorar su propio entorno para el cuidado de la salud, mostrando solidaridad y respeto ante las normas que garantizan el bienestar común de las personas.', 10, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T1_07', 'Características y funciones del órgano de la piel', 'Describir las características y funciones del órgano de la piel, como parte del cuidado de la salud.', 29, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T1_08', 'Situaciones en las cuales se apliquen hábitos de higiene', 'Distinguir situaciones en las cuales se apliquen hábitos de higiene, nutrición y normas de protección que permiten una piel sana.', 30, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T1_09', 'Diversidad de las características físicas de la piel de las personas', 'Apreciar la diversidad de las características físicas de la piel de las personas, tomando en cuenta la etnia a la que pertenecen', 11, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T1_10', 'Variedad de alimentos nutritivos', 'Reconocer la variedad de alimentos nutritivos y la importancia de su consumo en el bienestar humano, durante las diferentes etapas del desarrollo.', 31, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T1_11', 'Situaciones', 'Distinguir situaciones que afectan la calidad de los alimentos e influyen en el bienestar humano.', 32, 1);  -- C

-- 2° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T2_01', 'La importancia de los componentes de la naturaleza', 'Tomar conciencia de la importancia de los componentes de la naturaleza, en las etapas de desarrollo del ser humano y de otros seres vivos.', 12, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T2_02', 'Etapas de desarrollo en plantas y animales', 'Reconocer las etapas de desarrollo en plantas y animales, como parte del cuidado de toda forma de vida.', 33, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T2_03', 'Relación de algunos animales con la propagación de enfermedades contagiosas', 'Describir la relación de algunos animales con la propagación de enfermedades contagiosas, que perjudican la salud personal y comunitaria.', 34, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T2_04', 'El cumplimiento de medidas', 'Tomar conciencia en el cumplimiento de medidas para la prevención de enfermedades propagadas por animales, en la comunidad u otros lugares del país.', 13, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T2_05', 'Características de los seres vivos y los diferentes ambientes en que viven', 'Reconocer las características de los seres vivos y los diferentes ambientes en que viven, comprendiendo la importancia de conservarlos.', 35, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T2_06', 'Causas y efectos de la contaminación ocasionados por actividades humanas', 'Distinguir causas y efectos de la contaminación ocasionados por actividades humanas, en el entorno natural de la comunidad.', 36, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T2_07', 'Promoción de actividades', 'Valorar la promoción de actividades que mantienen un entorno natural y sociocultural armonioso.', 14, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T2_08', 'Estados de la materia', 'Diferenciar sensorialmente algunos estados de la materia, en objetos materiales que se utilizan en la vida diaria.', 37, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 2, 'CIE_G2_T2_09', 'Cambios de estado del agua con la intervención de la energía en forma de calor', 'Relacionar los cambios de estado del agua con la intervención de la energía en forma de calor, en actividades cotidianas.', 2, 2),  -- P
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T2_10', 'La importancia del Sol y su relación con los cambios de estado del agua', 'Tomar conciencia de la importancia del Sol y su relación con los cambios de estado del agua que ocurren en la naturaleza.', 15, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T2_11', 'Máquinas como objetos materiales y su importancia en el quehacer humano', 'Reconocer las máquinas como objetos materiales y su importancia en el quehacer humano.', 38, 2);  -- C

-- 2° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T3_01', 'Ejemplos de máquinas', 'Describir ejemplos de máquinas, que facilitan la realización de diferentes trabajos en la vida cotidiana.', 39, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T3_02', 'Creatividad del ser humano', 'Apreciar la creatividad del ser humano para facilitar el trabajo por medio de máquinas simples, en la vida diaria.', 16, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T3_03', 'Aspectos relacionados a la aplicación de la fuerza', 'Reconocer los aspectos relacionados a la aplicación de la fuerza, para producir cambios en los objetos materiales del entorno.', 40, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 2, 'CIE_G2_T3_04', 'Producción de trabajo', 'Demostrar la producción de trabajo, a partir de fuerzas aplicadas para mover objetos materiales ciertas distancias, en situaciones cotidianas.', 3, 3),  -- P
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T3_05', 'Aprecio por los beneficios que se obtienen por medio del trabajo producido por a', 'Aprecio por los beneficios que se obtienen por medio del trabajo producido por algunas máquinas, para el mejoramiento de las condiciones físicas del entorno.', 41, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T3_06', 'Pronósticos sencillos de la condición o estado del tiempo de la región', 'Comprender pronósticos sencillos de la condición o estado del tiempo de la región, en la cual se ubica la comunidad.', 42, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T3_07', 'Efectos en el entorno de las condiciones del tiempo y las medidas', 'Distinguir los efectos en el entorno de las condiciones del tiempo y las medidas para la prevención en situaciones extremas.', 43, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T3_08', 'Acciones de apoyo ante eventos naturales', 'Valorar las acciones apoyo para las personas que viven situaciones desfavorables ocasionadas por eventos naturales.', 17, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T3_09', 'Sol', 'Reconocer el Sol como la estrella que brinda luz y calor a la Tierra e influye en algunas condiciones del tiempo.', 44, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G2_T3_10', 'Características generales del Sistema Solar y los cuerpos que lo integran', 'Reconocer las características generales del Sistema Solar y los cuerpos que lo integran, entre ellos la Tierra como un planeta y la Luna como su satélite.', 45, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G2_T3_11', 'Información de los movimientos de los astros en diferentes situaciones', 'Apreciar la información de los movimientos de los astros en diferentes situaciones cotidianas.', 18, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 3° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 3° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T1_01', 'Algunos huesos y músculos', 'Reconocer algunos huesos y músculos, como parte de la comprensión y cuidado del cuerpo humano.', 46, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T1_02', 'Algunas funciones de los huesos y músculos', 'Describir algunas funciones de los huesos y músculos que permiten realizar actividades cotidianas.', 47, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T1_03', 'Cuidado y protección de los huesos y músculos del cuerpo humano', 'Valorar el cuidado y protección de los huesos y músculos del cuerpo humano para mantener una buena salud.', 19, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T1_04', 'Órganos que participan en el proceso digestivo de los alimentos', 'Reconocer los órganos que participan en el proceso digestivo de los alimentos, como parte del cuidado del cuerpo humano.', 48, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T1_05', 'Proceso digestivo mediante los cambios que sufren los alimentos', 'Comprender el proceso digestivo mediante los cambios que sufren los alimentos, para ser aprovechados por el cuerpo humano.', 49, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T1_06', 'La importancia del proceso digestivo en el cuidado de la salud de las personas', 'Tomar conciencia de la importancia del proceso digestivo en el cuidado de la salud de las personas.', 20, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T1_07', 'Medidas preventivas en el hogar', 'Describir medidas preventivas en el hogar, el centro educativo y la comunidad para el buen funcionamiento del proceso digestivo.', 50, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T1_08', 'Alimentos de acuerdo a su valor nutritivo', 'Reconocer los alimentos de acuerdo a su valor nutritivo, para el mantenimiento de la salud en general.', 51, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T1_09', 'Selección de alimentos', 'Apreciar la selección de alimentos que benefician el estilo y calidad de vida de las personas en la comunidad.', 21, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T1_10', 'Condiciones favorables', 'Identificar condiciones favorables que promueven la dignidad humana y el bienestar personal y comunitario.', 52, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T1_11', 'Medidas preventivas contra las manifestaciones de violencia física', 'Distinguir medidas preventivas contra las manifestaciones de violencia física, psicológica y sexual, que afectan la salud de las personas.', 53, 1);  -- C

-- 3° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T2_01', 'Acciones de denuncia ante toda manifestación de violencia', 'Valorar las acciones de denuncia ante toda manifestación de violencia, que afecte la convivencia de los seres vivos, en la institución, el hogar o la comunidad.', 22, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T2_02', 'Plantas y animales según el medio en', 'Clasificar plantas y animales según el medio en que viven y el tipo de alimentación que realizan algunos animales presentes en diferentes regiones del país, como parte de su cuidado y conservación.', 54, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T2_03', 'Utilidad de los componentes de la naturaleza', 'Describir la utilidad de los componentes de la naturaleza para el bienestar y supervivencia de los seres vivos.', 55, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T2_04', 'La importancia del mantenimiento del equilibrio ecológico', 'Tomar conciencia de la importancia del mantenimiento del equilibrio ecológico para la conservación de las diferentes formas de vida.', 23, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T2_05', 'Aspectos', 'Reconocer los aspectos que se relacionan con el uso racional de los componentes de la naturaleza, que permiten satisfacer las necesidades de la creciente población.', 56, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 2, 'CIE_G3_T2_06', 'Acciones en el hogar', 'Practicar acciones en el hogar, centro educativo y comunidad, dirigidas al uso racional de los recursos del entorno.', 4, 2),  -- P
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T2_07', 'Actitud crítica ante actividades humanas', 'Apreciar la actitud crítica ante actividades humanas que realizan un uso irracional de los componentes de la naturaleza.', 24, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T2_08', 'Fuentes de energía que requieren algunas máquinas', 'Determinar las fuentes de energía que requieren algunas máquinas, utilizadas por el ser humano en sus labores cotidianas.', 57, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T2_09', 'Máquinas de uso cotidiano en el centro educativo', 'Distinguir máquinas de uso cotidiano en el centro educativo, el hogar o la comunidad y su manejo adecuado.', 58, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T2_10', 'El manejo adecuado de algunas máquinas contribuye con el uso racional de la', 'Tomar conciencia que el manejo adecuado de algunas máquinas contribuye con el uso racional de la energía.', 25, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T2_11', 'Riegos del uso de algunas máquinas', 'Identificar los riegos del uso de algunas máquinas y las formas de prevención de accidentes en situaciones cotidianas.', 59, 2);  -- C

-- 3° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T3_01', 'Algunas ventajas', 'Distinguir algunas ventajas y desventajas de los adelantos científicos y tecnológicos en la construcción de máquinas, a partir de diferentes materiales.', 60, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T3_02', 'Ingenio en la fabricación de máquinas', 'Valorar el ingenio en la fabricación de máquinas que facilitan las labores cotidianas en la comunidad.', 26, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T3_03', 'Emplear instrumentos de medición y el Sistema Internacional de Unidades, para co', 'Emplear instrumentos de medición y el Sistema Internacional de Unidades, para conocer características físicas de los objetos materiales del entorno.', 61, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T3_04', 'Aplicaciones de las mediciones en diferentes situaciones cotidianas', 'Describir aplicaciones de las mediciones en diferentes situaciones cotidianas.', 62, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T3_05', 'La importancia de las mediciones en el uso racional de los materiales del', 'Tomar conciencia de la importancia de las mediciones en el uso racional de los materiales del entorno.', 27, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T3_06', 'Aspectos relacionados con las mediciones de los elementos meteorológicos', 'Reconocer los aspectos relacionados con las mediciones de los elementos meteorológicos que definen la condición o estado del tiempo.', 63, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T3_07', 'Emplear datos suministrados por las mediciones de los elementos meteorológicos, ', 'Emplear datos suministrados por las mediciones de los elementos meteorológicos, para la elaboración de predicciones sencillas de las condiciones del tiempo de la región, en la cual se localiza la comunidad.', 64, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T3_08', 'Importancia de la información meteorológica en la prevención de situaciones de', 'Valorar la importancia de la información meteorológica en la prevención de situaciones de riesgo que se pueden presentar en la comunidad.', 28, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T3_09', 'Algunos componentes del Sistema Solar', 'Identificar algunos componentes del Sistema Solar que pueden influir en las condiciones del estado del tiempo.', 65, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G3_T3_10', 'Características del planeta Tierra que benefician a las diversas formas de vida', 'Distinguir las características del planeta Tierra que benefician a las diversas formas de vida.', 66, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G3_T3_11', 'Condiciones del planeta Tierra', 'Apreciar las condiciones del planeta Tierra que hacen posible la vida de la especie humana y de otros seres vivos.', 29, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 4° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 4° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 2, 'CIE_G4_T1_01', 'Niveles de organización del cuerpo humano', 'Analizar los niveles de organización del cuerpo humano, para la comprensión de su funcionamiento integral.', 5, 1),  -- P
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T1_02', 'Proceso de la respiración', 'Explicar el proceso de la respiración, tomando en cuenta las funciones de los órganos involucrados y su importancia en el mantenimiento de la vida del ser humano.', 67, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T1_03', 'Importancia de las medidas preventivas', 'Valorar la importancia de las medidas preventivas, que contribuyen al cuidado del sistema respiratorio propio y de otras personas de la comunidad.', 30, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T1_04', 'Órganos y los componentes del tejido sanguíneo', 'Reconocer los órganos y los componentes del tejido sanguíneo, que constituyen el sistema circulatorio, como parte del cuidado general del cuerpo humano.', 68, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T1_05', 'Función del sistema circulatorio para el mantenimiento de una buena salud', 'Explicar la función del sistema circulatorio para el mantenimiento de una buena salud, tomando en cuenta las características de los órganos y componentes del tejido sanguíneo que lo integran.', 69, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T1_06', 'Medidas preventivas', 'Apreciar las medidas preventivas que contribuyen al cuidado del sistema circulatorio propio y de otras personas de la comunidad.', 31, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 2, 'CIE_G4_T1_07', 'Función inmunológica del tejido sanguíneo', 'Analizar la función inmunológica del tejido sanguíneo y su importancia en la salud del cuerpo humano.', 6, 1),  -- P
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T1_08', 'Función e importancia de las vacunas en la prevención de enfermedades', 'Explicar la función e importancia de las vacunas en la prevención de enfermedades, para el mantenimiento de una buena salud personal y comunitaria.', 70, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T1_09', 'La relación entre el SIDA y la función inmunológica en el cuerpo humano', 'Tomar conciencia de la relación entre el SIDA y la función inmunológica en el cuerpo humano, para evitar estigmas sociales y discriminación contra las personas VIH positivas.', 32, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T1_10', 'Algunos órganos', 'Reconocer algunos órganos que forman parte de los sistemas reproductores masculino y femenino, como parte del cuidado general del cuerpo humano.', 71, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T1_11', 'Medidas preventivas', 'Distinguir medidas preventivas, que contribuyen con el buen funcionamiento de los sistemas reproductores masculino y femenino.', 72, 1);  -- C

-- 4° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T2_01', 'Integridad humana propia y la de otras personas', 'Valorar la integridad humana propia y la de otras personas, así como la importancia de la denuncia en actos que atentan contra ella.', 33, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T2_02', 'Conceptos básicos relacionados con la biodiversidad', 'Describir conceptos básicos relacionados con la biodiversidad, para un mejor entendimiento del entorno natural.', 73, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T2_03', 'Aspectos', 'Explicar los aspectos que determinan la biodiversidad de Costa Rica y su importancia a nivel mundial.', 74, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T2_04', 'Los factores que amenazan la biodiversidad en la comunidad y su impacto', 'Tomar conciencia de los factores que amenazan la biodiversidad en la comunidad y su impacto para el país.', 34, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T2_05', 'Algunas clases de energía', 'Reconocer algunas clases de energía que se manifiestan en el entorno natural y su aplicación en la vida diaria.', 75, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T2_06', 'Manifestaciones de la energía potencial y cinética', 'Distinguir manifestaciones de la energía potencial y cinética, en situaciones cotidianas.', 76, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T2_07', 'Utilidad de la transformación de la energía potencial en energía cinética', 'Apreciar la utilidad de la transformación de la energía potencial en energía cinética y viceversa, en situaciones cotidianas.', 35, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T2_08', 'Aspectos básicos relacionados con el movimiento y la rapidez', 'Identificar aspectos básicos relacionados con el movimiento y la rapidez para un mejor entendimiento del entorno físico.', 77, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T2_09', 'Objetos físicos del entorno que están en movimiento y la rapidez', 'Distinguir objetos físicos del entorno que están en movimiento y la rapidez como indicador que caracteriza ese movimiento.', 78, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T2_10', 'El movimiento y la rapidez ocurren', 'Tomar conciencia que el movimiento y la rapidez ocurren como parte de los cambios que se observan continuamente en el entorno.', 36, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T2_11', 'Formas de transmisión del calor y sus aplicaciones en la vida diaria', 'Reconocer las formas de transmisión del calor y sus aplicaciones en la vida diaria.', 79, 2);  -- C

-- 4° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T3_01', 'Relación entre masa', 'Comprender la relación entre masa, calor y temperatura en situaciones cotidianas.', 80, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T3_02', 'Medidas preventivas ante situaciones', 'Valorar las medidas preventivas ante situaciones que involucren el uso del calor y la información que brindan las mediciones de la temperatura para evitar accidentes.', 37, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T3_03', 'Algunos de los fenómenos en', 'Reconocer algunos de los fenómenos en que interviene la luz y sus aplicaciones en la vida diaria.', 81, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T3_04', 'Fenómenos de reflexión y refracción de la luz en situaciones cotidianas', 'Describir los fenómenos de reflexión y refracción de la luz en situaciones cotidianas, por medio de materiales, pulidos, transparentes, translúcidos u opacos.', 82, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T3_05', 'Medidas preventivas ante situaciones', 'Valorar las medidas preventivas ante situaciones, en las cuales, la luz puede afectar al ser humano.', 38, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T3_06', 'Estructura externa e interna del planeta Tierra', 'Reconocer la estructura externa e interna del planeta Tierra, como parte del entendimiento de su integridad.', 83, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T3_07', 'Influencias recíprocas entre el clima y las actividades', 'Determinar las influencias recíprocas entre el clima y las actividades que realiza la especie humana.', 84, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T3_08', 'Las causas y efectos de la contaminación atmosférica y del agua', 'Tomar conciencia de las causas y efectos de la contaminación atmosférica y del agua, para la implementación de medidas preventivas que salvaguarden el bienestar del planeta.', 39, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T3_09', 'Movimientos del planeta Tierra y la Luna', 'Reconocer los movimientos del planeta Tierra y la Luna, como parte del entendimiento de su vinculación con el Universo.', 85, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G4_T3_10', 'Eclipses de Luna y de Sol', 'Explicar los eclipses de Luna y de Sol, a partir de la representación de los movimientos que realiza el planeta Tierra y la Luna.', 86, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G4_T3_11', 'Influencia de los movimientos del planeta Tierra y de la Luna', 'Apreciar la influencia de los movimientos del planeta Tierra y de la Luna, en las actividades que realiza la especie humana y otros seres vivos.', 40, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 5° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 5° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T1_01', 'Principales cambios que se presentan en hombres y mujeres', 'Identificar los principales cambios que se presentan en hombres y mujeres, al inicio de la madurez sexual y la función de los órganos de los sistemas reproductivos masculino y femenino en el proceso de la reproducción humana.', 87, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T1_02', 'Relación entre sexo, género y sexualidad', 'Explicar la relación entre sexo, género y sexualidad humana, así como los factores biológicos, psicológicos, sociales y espirituales que la determinan.', 88, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T1_03', 'Importancia de las medidas preventivas', 'Valorar la importancia de las medidas preventivas que contribuyan al cuidado de los sistemas reproductores masculino y femenino, para el beneficio de la salud.', 41, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T1_04', 'Órganos que forman la estructura del sistema urinario', 'Reconocer los órganos que forman la estructura del sistema urinario, como parte del cuidado general del cuerpo humano.', 89, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T1_05', 'Proceso de excreción', 'Explicar el proceso de excreción, tomando en cuenta las funciones de los órganos involucrados y su importancia en el mantenimiento de la vida del ser humano.', 90, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T1_06', 'Importancia de las medidas preventivas', 'Valorar la importancia de las medidas preventivas que contribuyan al cuidado del sistema renal en el hogar, el centro educativo y la comunidad.', 42, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 2, 'CIE_G5_T1_07', 'Interrelaciones entre los sistemas del cuerpo humano', 'Analizar las interrelaciones entre los sistemas del cuerpo humano, que permiten la comprensión de su funcionamiento y el cuidado de la salud.', 7, 1),  -- P
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T1_08', 'Aportes de los avances científicos y tecnológicos en la medicina', 'Distinguir los aportes de los avances científicos y tecnológicos en la medicina, para el bienestar de la especie humana.', 91, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T1_09', 'Las implicaciones éticas de los avances científicos y tecnológicos', 'Tomar conciencia de las implicaciones éticas de los avances científicos y tecnológicos que involucran pruebas con seres vivos.', 43, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T1_10', 'Características físicas propias de algunos organismos', 'Reconocer, como parte del estudio de la biodiversidad, las características físicas propias de algunos organismos, que permiten clasificarlos de diferentes maneras.', 92, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T1_11', 'Relaciones de interdependencia entre seres vivos', 'Describir algunas relaciones de interdependencia entre los seres vivos y su importancia en el equilibrio ecológico.', 93, 1);  -- C

-- 5° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T2_01', 'Acciones personales para uso racional de la flora', 'Valorar las acciones personales y comunitarias dirigidas al uso racional de la flora y la fauna de la región.', 44, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T2_02', 'Clasificación según obtención de alimento', 'Reconocer la clasificación de los seres vivos tomando en cuenta la forma de obtención de alimento, como parte del estudio de la biodiversidad.', 94, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T2_03', 'Proceso de fotosíntesis que realizan las plantas', 'Describir el proceso de fotosíntesis que realizan las plantas, como componentes esenciales del entorno natural.', 95, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T2_04', 'La importancia del proceso de la fotosíntesis', 'Tomar conciencia de la importancia del proceso de la fotosíntesis para el mantenimiento de la vida en el planeta Tierra.', 45, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T2_05', 'Aplicaciones de diferentes clases de energía en las actividades cotidianas', 'Identificar las aplicaciones de diferentes clases de energía en las actividades cotidianas que se realizan en la comunidad.', 96, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T2_06', 'Algunas transformaciones de la energía', 'Describir algunas transformaciones de la energía, utilizando diferentes materiales presentes en el entorno.', 97, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T2_07', 'Uso eficiente de las transformaciones de la energía', 'Apreciar el uso eficiente de las transformaciones de la energía, que posibilitan la realización de diferentes actividades en la vida cotidiana.', 46, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T2_08', 'Manifestaciones de la energía magnética', 'Reconocer las manifestaciones de la energía magnética, mediante los efectos de un imán en diferentes materiales del entorno.', 98, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T2_09', 'Algunos usos cotidianos de la energía magnética', 'Describir algunos usos cotidianos de la energía magnética y su relación con el campo magnético del planeta Tierra.', 99, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T2_10', 'Utilidad de la producción de energía magnética a partir de la energía eléctrica', 'Valorar la utilidad de la producción de energía magnética a partir de la energía eléctrica, en situaciones de la vida diaria.', 47, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T2_11', 'Existencia de la corriente eléctrica en fenómenos de la vida cotidiana', 'Reconocer la existencia de la corriente eléctrica en fenómenos de la vida cotidiana.', 100, 2);  -- C

-- 5° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T3_01', 'Tipos elementales de circuitos eléctricos', 'Distinguir los tipos elementales de circuitos eléctricos y la importancia de los materiales conductores de corriente eléctrica.', 101, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T3_02', 'Medidas de prevención de accidentes', 'Valorar las medidas de prevención de accidentes, relacionados con el uso de la energía eléctrica en la vida diaria.', 48, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T3_03', 'Transformaciones de energía', 'Explicar las transformaciones de energía, que ocurren en la generación de electricidad, desde las plantas hidroeléctricas hasta su uso en el hogar.', 102, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T3_04', 'Principales avances científicos y tecnológicos', 'Describir los principales avances científicos y tecnológicos para la generación de energía eléctrica en Costa Rica.', 103, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T3_05', 'Acciones dirigidas al uso racional de la energía eléctrica en la vida diaria', 'Valorar las acciones dirigidas al uso racional de la energía eléctrica en la vida diaria y su relación con la protección del ambiente y el ahorro económico a nivel local y nacional.', 49, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 2, 'CIE_G5_T3_06', 'Beneficios que puede obtener la especie humana', 'Analizar los beneficios que puede obtener la especie humana, a partir de los efectos producidos por los agentes internos que modifican el relieve terrestre.', 8, 3),  -- P
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T3_07', 'Efectos recíprocos entre los agentes externos', 'Describir los efectos recíprocos entre los agentes externos que modifican el relieve terrestre y las actividades que realiza la especie humana.', 104, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T3_08', 'La necesidad de implementación de acciones', 'Tomar conciencia de la necesidad de implementación de acciones y medidas preventivas ante los eventos sísmicos y volcánicos que ocurren en el país.', 50, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T3_09', 'Algunos acontecimientos', 'Reconocer algunos acontecimientos que han marcado los inicios de la observación y registro de fenómenos astronómicos y la exploración espacial.', 105, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G5_T3_10', 'Algunos componentes del universo y los cuerpos que conforman el Sistema Solar', 'Describir algunos componentes del universo y los cuerpos que conforman el Sistema Solar, entre ellos el planeta Tierra.', 106, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G5_T3_11', 'Aportes de la investigación espacial', 'Valorar los aportes de la investigación espacial, considerando las implicaciones para el desarrollo de la humanidad.', 51, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 6° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 6° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T1_01', 'Principales componentes del sistema nervioso y sus funciones en el cuerpo humano', 'Identificar los principales componentes del sistema nervioso y sus funciones en el cuerpo humano, como parte del cuidado de la salud.', 107, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T1_02', 'Medidas preventivas en el hogar', 'Describir medidas preventivas en el hogar, centro educativo y comunidad, que contribuyan al buen funcionamiento del sistema nervioso.', 108, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T1_03', 'Algunas consecuencias del consumo de drogas en el sistema nervioso', 'Tomar conciencia de algunas consecuencias del consumo de drogas en el sistema nervioso y formas de prevención para el cuidado de la salud.', 52, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T1_04', 'Glándulas', 'Reconocer las glándulas que forman el sistema endocrino y las funciones que cumplen en la coordinación y equilibrio de la salud del cuerpo humano.', 109, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T1_05', 'Relación entre los sistemas nervioso y endocrino', 'Describir la relación entre los sistemas nervioso y endocrino para comprender su importancia en el funcionamiento del cuerpo humano.', 110, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T1_06', 'Equilibrio adecuado entre los sistemas del cuerpo humano', 'Valorar el equilibrio adecuado entre los sistemas del cuerpo humano, para mantener una buena salud física y mental.', 53, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T1_07', 'Procesos relacionados con la madurez sexual y la reproducción humana', 'Reconocer los procesos relacionados con la madurez sexual y la reproducción humana como parte del cuidado de la salud.', 111, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T1_08', 'Importancia de la maternidad y paternidad responsables', 'Describir la importancia de la maternidad y paternidad responsables, en la procreación y calidad de vida de los(as) hijos(as).', 112, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T1_09', 'Interrelaciones entre los sistemas del cuerpo humano', 'Valorar las interrelaciones entre los sistemas del cuerpo humano, que permiten la comprensión de su funcionamiento integral y el cuidado de la salud.', 54, 1),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T1_10', 'Interrelaciones entre los componentes de los ecosistemas', 'Describir las interrelaciones entre los componentes de los ecosistemas, como parte del cuidado de la biodiversidad.', 113, 1),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T1_11', 'Niveles de organización de los seres vivos', 'Distinguir los niveles de organización de los seres vivos, apreciando las relaciones que establecen en diferentes ecosistemas.', 114, 1);  -- C

-- 6° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T2_01', 'Diversidad de ecosistemas', 'Valorar la diversidad de ecosistemas, paisajes y riqueza biológica de nuestro país, para su conservación y aprovechamiento sostenible.', 55, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T2_02', 'Eventos naturales y las acciones humanas que alteran el equilibrio ecológico', 'Identificar los eventos naturales y las acciones humanas que alteran el equilibrio ecológico.', 115, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T2_03', 'Efectos', 'Describir los efectos y consecuencias de las acciones provocadas por los eventos naturales y actividades humanas, en la vida diaria.', 116, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T2_04', 'Prácticas personales y comunitarias', 'Valorar las prácticas personales y comunitarias que contrarrestan los efectos negativos de los eventos naturales y actividades humanas, para el fortalecimiento del desarrollo sostenible de Costa Rica.', 56, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T2_05', 'Metodología utilizada en los avances científicos y tecnológicos', 'Describir la metodología utilizada en los avances científicos y tecnológicos para el aprovechamiento de algunas clases de energía y su importancia para el desarrollo económico del país.', 117, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T2_06', 'Aplicaciones de la energía eólica en situaciones cotidianas', 'Distinguir las aplicaciones de la energía eólica en situaciones cotidianas y su impacto en el ambiente.', 118, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T2_07', 'Los efectos causados', 'Tomar conciencia de los efectos causados, por el uso de fuentes de energías contaminantes y no contaminantes en el ambiente.', 57, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T2_08', 'Energía sonora', 'Reconocer la energía sonora como efecto de la vibración de los cuerpos materiales presentes en el entorno.', 119, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T2_09', 'Aplicaciones de la energía sonora en situaciones cotidianas', 'Distinguir aplicaciones de la energía sonora en situaciones cotidianas que realiza la especie humana y las formas en que la aprovechan otros seres vivos.', 120, 2),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T2_10', 'Medidas de protección contra ruidos y sonidos', 'Valorar las medidas de protección contra ruidos y sonidos que afectan la salud propia y de las demás personas.', 58, 2),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T2_11', 'Entre cambios físicos y cambios químicos', 'Distinguir entre cambios físicos y cambios químicos que pueden experimentar los materiales presentes en el entorno.', 121, 2);  -- C

-- 6° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T3_01', 'Importancia del desarrollo científico', 'Comprender la importancia del desarrollo científico y tecnológico en el aprovechamiento racional de los materiales.', 122, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T3_02', 'Del crecimiento de la población humana', 'Tomar conciencia del crecimiento de la población humana y la demanda del uso racional de la materia prima y la energía, para el mejoramiento de la calidad de vida.', 59, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T3_03', 'Criterios que determinan la clasificación de los materiales del entorno', 'Identificar los criterios que determinan la clasificación de los materiales del entorno.', 123, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T3_04', 'Mezclas y sustancias puras', 'Clasificar en mezclas y sustancias puras, los materiales que se utilizan en situaciones cotidianas.', 124, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T3_05', 'Ingenio de la especie humana para la utilización de diferentes sustancias puras', 'Apreciar el ingenio de la especie humana para la utilización de diferentes sustancias puras, en la vida diaria.', 60, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T3_06', 'Algunas de las condiciones básicas presentes en el planeta Tierra', 'Reconocer algunas de las condiciones básicas presentes en el planeta Tierra, que permiten el desarrollo de la vida.', 125, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T3_07', 'Cambios más evidentes de la evolución del planeta Tierra', 'Describir los cambios más evidentes de la evolución del planeta Tierra, como parte de la comprensión de su integridad.', 126, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T3_08', 'Actividades humanas', 'Valorar las actividades humanas que contribuyen al mantenimiento del equilibrio ecológico y beneficien a toda forma de vida.', 61, 3),  -- A
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T3_09', 'Teorías del origen y la formación del Sistema Solar', 'Explicar las teorías del origen y la formación del Sistema Solar como parte del entendimiento de la evolución del planeta Tierra.', 127, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 1, 'CIE_G6_T3_10', 'Algunas de las teorías del origen y evolución del Universo', 'Describir algunas de las teorías del origen y evolución del Universo para comprender las condiciones esenciales que permitieron la formación de nuestro Sistema Solar.', 128, 3),  -- C
((SELECT id FROM materias WHERE clave='CIENCIAS'), 3, 'CIE_G6_T3_11', 'Importancia de los avances científicos', 'Valorar la importancia de los avances científicos y tecnológicos en el área de la exploración espacial.', 62, 3);  -- A


-- ============================================================================
-- 4) Vincular cada eje a su grado correspondiente (ejes_tematicos_niveles)
--    Cada eje de Ciencias aplica a UN solo grado (el de su clave CIE_G{n}_*).
-- ============================================================================


-- Grado 1° → todos los ejes con clave CIE_G1_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'CIE_G1_%'
  AND n.numero_grado = 1
ON CONFLICT DO NOTHING;

-- Grado 2° → todos los ejes con clave CIE_G2_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'CIE_G2_%'
  AND n.numero_grado = 2
ON CONFLICT DO NOTHING;

-- Grado 3° → todos los ejes con clave CIE_G3_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'CIE_G3_%'
  AND n.numero_grado = 3
ON CONFLICT DO NOTHING;

-- Grado 4° → todos los ejes con clave CIE_G4_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'CIE_G4_%'
  AND n.numero_grado = 4
ON CONFLICT DO NOTHING;

-- Grado 5° → todos los ejes con clave CIE_G5_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'CIE_G5_%'
  AND n.numero_grado = 5
ON CONFLICT DO NOTHING;

-- Grado 6° → todos los ejes con clave CIE_G6_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'CIE_G6_%'
  AND n.numero_grado = 6
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 5) Actualizar vista de catálogo para incluir periodo_numero
-- ============================================================================
DROP VIEW IF EXISTS vw_ejes_por_materia_nivel CASCADE;

CREATE VIEW vw_ejes_por_materia_nivel AS
SELECT
    en.nivel_id,
    n.numero_grado,
    e.materia_id,
    m.clave           AS materia_clave,
    m.nombre          AS materia_nombre,
    e.tipo_saber_id,
    ts.clave          AS tipo_saber_clave,
    ts.nombre         AS tipo_saber_nombre,
    e.id              AS eje_id,
    e.clave           AS eje_clave,
    e.nombre          AS eje_nombre,
    e.descripcion     AS eje_descripcion,
    e.orden           AS eje_orden,
    e.periodo_numero  AS eje_periodo
FROM ejes_tematicos_niveles en
JOIN ejes_tematicos e ON e.id = en.eje_tematico_id
JOIN niveles n        ON n.id = en.nivel_id
JOIN materias m       ON m.id = e.materia_id
JOIN tipos_saber ts   ON ts.id = e.tipo_saber_id;

COMMENT ON VIEW vw_ejes_por_materia_nivel IS
    'Catálogo plano de ejes filtrables por materia, tipo de saber, nivel/grado y trimestre.';

-- ============================================================================
-- 6) Verificación final (opcional, queda como comentario informativo)
-- ============================================================================
--   SELECT COUNT(*) FROM ejes_tematicos
--   WHERE materia_id = (SELECT id FROM materias WHERE clave = 'CIENCIAS');
--   -- Debe devolver 198
--
--   SELECT periodo_numero, tipo_saber_id, COUNT(*)
--   FROM ejes_tematicos
--   WHERE materia_id = (SELECT id FROM materias WHERE clave = 'CIENCIAS')
--   GROUP BY periodo_numero, tipo_saber_id
--   ORDER BY periodo_numero, tipo_saber_id;
