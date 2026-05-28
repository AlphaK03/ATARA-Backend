-- =============================================================================
-- V18: Ejes temáticos de ESTUDIOS SOCIALES Y CÍVICA alineados al currículo MEP CR
--
-- Cambio principal:
--   Hasta V12/V13, Estudios Sociales tenía 21 ejes genéricos (SC_HISTORIA,
--   SP_GEOGRAFIA, SA_DERECHOS, etc.) que aplicaban a todos los grados sin
--   distinción de trimestre. Esto no reflejaba la progresión secuencial del
--   Programa de Estudio MEP (Setiembre 2013) para "Estudios Sociales y
--   Educación Cívica – Primer y Segundo Ciclos de la EGB", donde cada unidad
--   anual (= un trimestre) tiene contenidos curriculares específicos
--   organizados en tres dimensiones: Conceptuales, Procedimentales y
--   Actitudinales.
--
-- Solución:
--   1. La columna `periodo_numero` (SMALLINT NULL) en ejes_tematicos YA EXISTE
--      desde V17 (Ciencias). No se vuelve a crear.
--   2. Se ELIMINAN los 21 ejes genéricos previos de Estudios Sociales
--      (SC_*, SP_*, SA_*) y todas sus relaciones dependientes.
--   3. Se INSERTAN 219 ejes nuevos para Estudios Sociales, distribuidos así:
--        6 grados (1°-6°) × 3 trimestres × cantidad variable según unidad MEP
--      Cada eje proviene de un ítem del componente "5. Contenidos Curriculares"
--      del PDF MEP, columna correspondiente (Conceptual/Procedimental/Actitudinal).
--   4. Se vincula cada eje a su grado correspondiente vía ejes_tematicos_niveles.
--   5. La vista vw_ejes_por_materia_nivel YA FUE actualizada por V17 para
--      incluir periodo_numero — no se vuelve a crear.
--
-- Clasificación por tipo_saber (basada en la columna del PDF MEP):
--   - Conceptual (1)  ← columna "CONCEPTUALES" del programa MEP
--     Verbo dominante: Reconocer, Identificar, Describir, Comprender, Distinguir.
--   - Procedimental (2) ← columna "PROCEDIMENTALES" del programa MEP
--     Verbo dominante: Practicar, Construir, Analizar, Relacionar, Aplicar.
--   - Actitudinal (3) ← columna "ACTITUDINALES" del programa MEP
--     Verbo dominante: Valorar, Apreciar, Vivenciar, Tomar conciencia, Respetar.
--
-- Convención de clave: SOC_G{grado}_T{trimestre}_{pos:02d}
--   Ejemplo: SOC_G3_T2_05 = Estudios Sociales, 3° grado, Trimestre II, posición 5
--
-- Distribución por grado (total = 219):
--   G1° = 30   G2° = 43   G3° = 44   G4° = 35   G5° = 37   G6° = 30
--
-- Nota de sintaxis: la coma estructural entre filas VALUES va ANTES del
-- comentario -- C/-- P/-- A, para que no sea engullida por el comentario
-- de línea de SQL.
--
-- Filtrado esperado en el wizard de evaluación:
--   SELECT * FROM ejes_tematicos e
--   JOIN ejes_tematicos_niveles en ON en.eje_tematico_id = e.id
--   WHERE e.materia_id = (SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES')
--     AND en.nivel_id = :grade_nivel_id
--     AND (e.periodo_numero = :trimestre OR e.periodo_numero IS NULL)
--   ORDER BY e.tipo_saber_id, e.orden;
-- =============================================================================

-- ============================================================================
-- 1) Limpiar ejes anteriores de ESTUDIOS_SOCIALES (SC_*, SP_*, SA_*)
--    Se limpia en orden inverso de dependencias para evitar errores de FK
--    (algunas relaciones no tienen ON DELETE CASCADE).
-- ============================================================================

-- 1a) Borrar detalles de evaluación que referencian ejes de Estudios Sociales
DELETE FROM detalle_evaluacion_saber
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESTUDIOS_SOCIALES')
);

-- 1b) Borrar alertas temáticas de Estudios Sociales
DELETE FROM alertas_tematicas
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESTUDIOS_SOCIALES')
);

-- 1c) Borrar relaciones eje ↔ nivel para Estudios Sociales
DELETE FROM ejes_tematicos_niveles
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESTUDIOS_SOCIALES')
);

-- 1d) Borrar los 21 ejes genéricos antiguos (SC_*, SP_*, SA_*)
DELETE FROM ejes_tematicos
WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESTUDIOS_SOCIALES');

-- ============================================================================
-- 2) Insertar 219 ejes nuevos para ESTUDIOS_SOCIALES (orden PDF MEP)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- GRADO 1° (30 ejes)
-- ---------------------------------------------------------------------------

-- 1° — Trimestre I (10 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G1_T1_01', 'Los Estudios Sociales y la Educación Cívica', 'Reconocer los Estudios Sociales y la Educación Cívica — incluyendo una materia llamada estudios sociales y educación cívica, la historia para mi ubicación temporal, la geografía para mi ubicación espacial, la convivencia como eje de la educación cívica.', 1, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T1_02', 'Estudios Sociales y la Educación Cívica para valorar su importancia en la vida cotidiana de los estudiantes', 'Conocer los Estudios Sociales y la Educación Cívica para valorar su importancia en la vida cotidiana de los estudiantes.', 1, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T1_03', 'historia personal para visualizarse como parte de una familia y de la sociedad', 'Reconocer la historia personal para visualizarse como parte de una familia y de la sociedad.', 2, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T1_04', 'historias familiares para reconocer su importancia, organización y diversidad', 'Valorar las historias familiares para reconocer su importancia, organización y diversidad.', 3, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T1_05', 'espacio para visualizar la relación de la sociedad y el medio en la vida cotidiana', 'Reconocer el espacio para visualizar la relación de la sociedad y el medio en la vida cotidiana.', 4, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T1_06', 'principios de protección, afectividad y diversidad para el disfrute de la convivencia', 'Reconocer los principios de protección, afectividad y diversidad para el disfrute de la convivencia.', 5, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T1_07', 'reconocer su historia de vida', 'Asumir actitud positiva al reconocer su historia de vida.', 1, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T1_08', 'distintas historias familiares compartidas', 'Apreciar las distintas historias familiares compartidas.', 2, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T1_09', 'importancia del espacio y el medio', 'Valorar la importancia del espacio y el medio.', 3, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T1_10', 'derechos y deberes en el marco de la convivencia del centro educativo', 'Vivenciar los derechos y deberes en el marco de la convivencia del centro educativo.', 4, 1);  -- A

-- 1° — Trimestre II (10 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G1_T2_01', 'Nociones de espacio', 'Reconocer nociones de espacio — incluyendo ubicación de los siguientes elementos con respecto a mi hogar.', 2, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G1_T2_02', 'Nociones de tiempo', 'Reconocer nociones de tiempo — incluyendo el antes, ahora y el después, el día y la noche, el tiempo histórico, responsabilidades de acuerdo a la edad y condición personal.', 3, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T2_03', 'diversas nociones de espacio en la vida cotidiana', 'Reconocer diversas nociones de espacio en la vida cotidiana.', 6, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T2_04', 'nociones de espacio y tiempo en el contexto en que se desarrolla', 'Vivenciar las nociones de espacio y tiempo en el contexto en que se desarrolla.', 7, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T2_05', 'noción de tiempo a partir de las experiencias cotidianas', 'Reconocer la noción de tiempo a partir de las experiencias cotidianas.', 8, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T2_06', 'distintas prácticas que se desarrollan en el centro educativo y el distrito, de forma responsable', 'Valorar las distintas prácticas que se desarrollan en el centro educativo y el distrito, de forma responsable.', 9, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T2_07', 'puesta en práctica de las nociones de espacio', 'Mostrar interés en la puesta en práctica de las nociones de espacio.', 5, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T2_08', 'nociones de espacio y tiempo en la vida cotidiana', 'Valorar las nociones de espacio y tiempo en la vida cotidiana.', 6, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T2_09', 'distintas actividades cotidianas a partir de las nociones de tiempo', 'Vivenciar distintas actividades cotidianas a partir de las nociones de tiempo.', 7, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T2_10', 'sensibilización hacia la familia como elemento promotor de prácticas responsables', 'Valorar sensibilización hacia la familia como elemento promotor de prácticas responsables.', 8, 2);  -- A

-- 1° — Trimestre III (10 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G1_T3_01', 'Mi escuela como parte del distrito', 'Reconocer mi escuela como parte del distrito — incluyendo ubicación en una comunidad y en un distrito, historia de la fundación de mi escuela, importancia de mi escuela en el distrito, principales emblemas de la escuela y del distrito.', 4, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G1_T3_02', 'La escuela como un espacio para sentirse seguro y segura, protegido y protegida', 'Reconocer la escuela como un espacio para sentirse seguro y segura, protegido y protegida — incluyendo importancia del papel de las distintas personas que son parte del centro educativo, rechazo al matonismo o bullying, lo malo del bullying (o matonismo).', 5, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T3_03', 'historia de la escuela y su papel en el distrito para valorar su importancia', 'Reconocer la historia de la escuela y su papel en el distrito para valorar su importancia.', 10, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T3_04', 'importancia del centro educativo como espacio de convivencia armoniosa de acuerdo con las actividades y personas que son parte de él', 'Comprender la importancia del centro educativo como espacio de convivencia armoniosa de acuerdo con las actividades y personas que son parte de él.', 11, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G1_T3_05', 'formas de Matonismo o Bullying para denunciarlas oportunamente', 'Reconocer las formas de Matonismo o Bullying para denunciarlas oportunamente.', 12, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T3_06', 'ante el estudio de su comunidad', 'Asumir actitud positiva ante el estudio de su comunidad.', 9, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T3_07', 'escuela como un espacio para aprender y compartir', 'Valorar la escuela como un espacio para aprender y compartir.', 10, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T3_08', 'centro educativo al que pertenece', 'Respetar el centro educativo al que pertenece.', 11, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T3_09', 'valorar el trabajo realizado por otras personas', 'Mostrar interés en valorar el trabajo realizado por otras personas.', 12, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G1_T3_10', 'hacia el desarrollo de prácticas orientadas a la denuncia del matonismo (bullying)', 'Asumir actitud positiva hacia el desarrollo de prácticas orientadas a la denuncia del matonismo (bullying).', 13, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 2° (43 ejes)
-- ---------------------------------------------------------------------------

-- 2° — Trimestre I (13 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T1_01', 'La comunidad de mi cantón', 'Reconocer la comunidad de mi cantón — incluyendo ubicación geográfica, aportes de la comunidad en el surgimiento del cantón, costumbres y tradiciones de mi cantón.', 6, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T1_02', 'Los espacios rurales y urbanos cercanos de mi cantón', 'Reconocer los espacios rurales y urbanos cercanos de mi cantón — incluyendo características generales.', 7, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T1_03', 'Espacios de participación y representación en el cantón', 'Reconocer espacios de participación y representación en el cantón — incluyendo características generales e importancia de los espacios.', 8, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T1_04', 'e importancia del cantón donde se ubica el centro educativo', 'Identificar e importancia del cantón donde se ubica el centro educativo.', 13, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T1_05', 'historia de la comunidad para reconocer su papel en el desarrollo del cantón', 'Comprender la historia de la comunidad para reconocer su papel en el desarrollo del cantón.', 14, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T1_06', 'costumbres y tradiciones que identifican el cantón donde se ubica la escuela', 'Valorar las costumbres y tradiciones que identifican el cantón donde se ubica la escuela.', 15, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T1_07', 'características de los espacios rurales y urbanos cantonales', 'Identificar las características de los espacios rurales y urbanos cantonales.', 16, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T1_08', 'importancia de los espacios representativos como formas para la expresión de los y las estudiantes', 'Reconocer la importancia de los espacios representativos como formas para la expresión de los y las estudiantes.', 17, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T1_09', 'espacio geográfico donde se ubica el centro educativo', 'Apreciar el espacio geográfico donde se ubica el centro educativo.', 14, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T1_10', 'hacia el conocimiento del pasado del Cantón', 'Asumir actitud positiva hacia el conocimiento del pasado del Cantón.', 15, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T1_11', 'interactúa armónicamente con su entorno social y natural', 'Valorar interactúa armónicamente con su entorno social y natural.', 16, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T1_12', 'costumbres y tradiciones de los habitantes de su comunidad', 'Respetar las costumbres y tradiciones de los habitantes de su comunidad.', 17, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T1_13', 'promover su participación en diversas actividades del cantón', 'Mostrar interés en promover su participación en diversas actividades del cantón.', 18, 1);  -- A

-- 2° — Trimestre II (14 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T2_01', 'Elementos básicos de simbología', 'Reconocer elementos básicos de simbología — incluyendo nociones de orientación geográfica en mi cantón.', 9, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T2_02', 'La seguridad personal y la seguridad vial en los espacios rurales y urbanos de mi cantón', 'Reconocer la seguridad personal y la seguridad vial en los espacios rurales y urbanos de mi cantón — incluyendo conductas responsables para fomentar actitudes y prácticas responsables.', 10, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T2_03', 'Historias rurales y urbanas presentes en el cantón', 'Reconocer historias rurales y urbanas presentes en el cantón.', 11, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T2_04', 'ubicación de lugares a partir de las nociones básicas de orientación geográfica', 'Practicar ubicación de lugares a partir de las nociones básicas de orientación geográfica.', 18, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T2_05', 'croquis sencillos relacionados con los espacios cercanos al centro educativo', 'Construir croquis sencillos relacionados con los espacios cercanos al centro educativo.', 19, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T2_06', 'medidas de seguridad personal en su tránsito por las vías públicas', 'Vivenciar medidas de seguridad personal en su tránsito por las vías públicas.', 20, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T2_07', 'actitudes y prácticas responsables para el fortalecimiento de la la seguridad personal y vial de los habitantes del cantón', 'Reconocer las actitudes y prácticas responsables para el fortalecimiento de la la seguridad personal y vial de los habitantes del cantón.', 21, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T2_08', 'importancia de las historias comunales y su relación con la identidad cantonal', 'Reconocer la importancia de las historias comunales y su relación con la identidad cantonal.', 22, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T2_09', 'distintas formas de relieve en contextos cantonales', 'Apreciar las distintas formas de relieve en contextos cantonales.', 19, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T2_10', 'realizar prácticas de ubicación geográfica', 'Asumir actitud positiva al realizar prácticas de ubicación geográfica.', 20, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T2_11', 'trabajo propio y de los demás', 'Respetar el trabajo propio y de los demás.', 21, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T2_12', 'actitudes responsables en la promoción de la seguridad vial', 'Valorar actitudes responsables en la promoción de la seguridad vial.', 22, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T2_13', 'reconocer la importancia de las instituciones cantonales responsables de la seguridad personal y vial', 'Asumir actitud positiva al reconocer la importancia de las instituciones cantonales responsables de la seguridad personal y vial.', 23, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T2_14', 'reconstruir el pasado del cantón', 'Mostrar interés en reconstruir el pasado del cantón.', 24, 2);  -- A

-- 2° — Trimestre III (16 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T3_01', 'Relieve del cantón', 'Reconocer relieve del cantón — incluyendo escenarios y paisajes naturales existentes, disfrute de los paisajes naturales.', 12, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T3_02', 'Desarrollo cultural de mi cantón', 'Reconocer desarrollo cultural de mi cantón — incluyendo reseña histórica, mujeres y hombres representativos en el desarrollo social y cultural del cantón.', 13, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T3_03', 'Espacios de participación y representación en la institución educativa como parte del cantón', 'Reconocer espacios de participación y representación en la institución educativa como parte del cantón — incluyendo certámenes, concursos, actividades deportivas y académicas, bandas y grupos, organismos de representación estudiantil.', 14, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G2_T3_04', 'Importancia de los espacios de participación y representación para el desarrollo del cantón', 'Reconocer importancia de los espacios de participación y representación para el desarrollo del cantón — incluyendo la municipalidad y su importancia, el alcalde o alcaldesa, el concejo municipal, asociación de desarrollo comunal.', 15, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T3_05', 'diversos espacios geográficos que caracterizan el cantón', 'Identificar los diversos espacios geográficos que caracterizan el cantón.', 23, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T3_06', 'disfrute de los paisajes naturales y culturales propios del espacio cantonal', 'Practicar disfrute de los paisajes naturales y culturales propios del espacio cantonal.', 24, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T3_07', 'aporte de los habitantes del cantón en su desarrollo histórico y cultural', 'Reconocer el aporte de los habitantes del cantón en su desarrollo histórico y cultural.', 25, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T3_08', 'espacios de participación existentes en el centro educativo y el cantón', 'Reconocer los espacios de participación existentes en el centro educativo y el cantón.', 26, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T3_09', 'Municipalidad como institución promotora del desarrollo cantonal', 'Valorar la Municipalidad como institución promotora del desarrollo cantonal.', 27, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G2_T3_10', 'importancia del Consejo Municipal, Alcalde y Asociaciones de Desarrollo Comunal en el fortalecimiento de la democracia', 'Identificar la importancia del Consejo Municipal, Alcalde y Asociaciones de Desarrollo Comunal en el fortalecimiento de la democracia.', 28, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T3_11', 'distintas formas de relieve en contextos cantonales', 'Apreciar las distintas formas de relieve en contextos cantonales.', 25, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T3_12', 'papel de hombres y mujeres destacados del cantón para reconocer el aporte a su desarrollo', 'Valorar el papel de hombres y mujeres destacados del cantón para reconocer el aporte a su desarrollo.', 26, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T3_13', 'compartir con otras personas mediante la participación y la representación en diversos espacios', 'Mostrar interés en compartir con otras personas mediante la participación y la representación en diversos espacios.', 27, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T3_14', 'hacia las instituciones que velan por el desarrollo cantonal', 'Respetar hacia las instituciones que velan por el desarrollo cantonal.', 28, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T3_15', 'democracia como forma de vida que promueve el diálogo y el respeto a las mayorías', 'Valorar la democracia como forma de vida que promueve el diálogo y el respeto a las mayorías.', 29, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G2_T3_16', 'actitudes responsables para la protección y embellecimiento de los escenarios naturales y culturales del cantón', 'Valorar actitudes responsables para la protección y embellecimiento de los escenarios naturales y culturales del cantón.', 30, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 3° (44 ejes)
-- ---------------------------------------------------------------------------

-- 3° — Trimestre I (15 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T1_01', 'Mi provincia en el mapa de Costa Rica', 'Reconocer mi provincia en el mapa de Costa Rica — incluyendo noción de mapa, escala y simbología, coordenadas geográficas (paralelos, meridianos, latitud, longitud), puntos cardinales, la provincia donde vivo.', 16, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T1_02', 'La historia de mi provincia', 'Reconocer la historia de mi provincia — incluyendo acontecimientos e hitos importantes, costumbres y tradiciones.', 17, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T1_03', 'Celebremos las efemérides en mi provincia. Importancia y relación con el contexto actual: o 20 marzo de 1856. o 11 de abril de 1856', 'Reconocer celebremos las efemérides en mi provincia. Importancia y relación con el contexto actual: o 20 marzo de 1856. o 11 de abril de 1856.', 18, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T1_04', 'mapa de Costa Rica como herramienta fundamental en el estudio de la geografía', 'Reconocer el mapa de Costa Rica como herramienta fundamental en el estudio de la geografía.', 29, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T1_05', 'elementos del mapa para el uso correcto e interpretación del mismo', 'Identificar los elementos del mapa para el uso correcto e interpretación del mismo.', 30, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T1_06', 'prácticas de ubicación geográfica para conocer la provincia que habitamos', 'Desarrollar prácticas de ubicación geográfica para conocer la provincia que habitamos.', 31, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T1_07', 'procesos históricos que dan origen a la provincia, para reconocer el papel en su desarrollo', 'Comprender los procesos históricos que dan origen a la provincia, para reconocer el papel en su desarrollo.', 32, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T1_08', 'diferentes manifestaciones culturales en las provincias para expresar sentimientos éticos, estéticos y ciudadanos', 'Valorar las diferentes manifestaciones culturales en las provincias para expresar sentimientos éticos, estéticos y ciudadanos.', 33, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T1_09', 'significado de las efemérides con relación al contexto actual para enriquecer las identidades provinciales', 'Valorar el significado de las efemérides con relación al contexto actual para enriquecer las identidades provinciales.', 34, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T1_10', 'ante la utilización del mapa como herramienta didáctica', 'Asumir actitud positiva ante la utilización del mapa como herramienta didáctica.', 31, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T1_11', 'aplicar las nociones básicas de cartografía', 'Mostrar interés en aplicar las nociones básicas de cartografía.', 32, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T1_12', 'adecuado del mapa en las prácticas de ubicación geográfica', 'Usar adecuado del mapa en las prácticas de ubicación geográfica.', 33, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T1_13', 'historia en el desarrollo de los pueblos', 'Valorar la historia en el desarrollo de los pueblos.', 34, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T1_14', 'hacia las celebraciones de la Patria', 'Respetar hacia las celebraciones de la Patria.', 35, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T1_15', 'raíces de la identidad provincial y nacional', 'Apreciar las raíces de la identidad provincial y nacional.', 36, 1);  -- A

-- 3° — Trimestre II (15 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T2_01', 'Formas de relieve de la provincia donde vivo', 'Reconocer formas de relieve de la provincia donde vivo — incluyendo montañas, valles, llanuras, costas y cuencas hidrográficas, actividades socioeconómicas en las distintas formas del relieve de mi provincia.', 19, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T2_02', 'El sentido histórico del patrimonio cultural y natural de la provincia', 'Reconocer el sentido histórico del patrimonio cultural y natural de la provincia — incluyendo generalidades e importancia.', 20, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T2_03', 'Celebremos las efemérides en mi provincia. Importancia y relación con el contexto actual', 'Reconocer celebremos las efemérides en mi provincia. Importancia y relación con el contexto actual — incluyendo 25 de julio de 1824 y su importancia para la ciudadanía costarricense.', 21, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T2_04', 'elementos geográficos que conforman el relieve de la provincia', 'Identificar los elementos geográficos que conforman el relieve de la provincia.', 35, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T2_05', 'relieve como el escenario para el desarrollo de las actividades humanas', 'Valorar el relieve como el escenario para el desarrollo de las actividades humanas.', 36, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T2_06', 'importancia del patrimonio cultural y natural para el desarrollo de la sociedad', 'Valorar la importancia del patrimonio cultural y natural para el desarrollo de la sociedad.', 37, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T2_07', 'belleza estética del patrimonio de la provincia para su cuidado, embellecimiento y preservación', 'Reconocer la belleza estética del patrimonio de la provincia para su cuidado, embellecimiento y preservación.', 38, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T2_08', 'efemérides como elementos fundamentales de la identidad de la Nación', 'Valorar las efemérides como elementos fundamentales de la identidad de la Nación.', 39, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T2_09', 'distintas formas de relieve en contextos provinciales', 'Apreciar las distintas formas de relieve en contextos provinciales.', 37, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T2_10', 'hacia el estudio del espacio geográfico y su importancia para el ser humano', 'Asumir actitud positiva hacia el estudio del espacio geográfico y su importancia para el ser humano.', 38, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T2_11', 'reconocer la importancia del relieve y la relación con su desarrollo', 'Mostrar interés en reconocer la importancia del relieve y la relación con su desarrollo.', 39, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T2_12', 'hacia el patrimonio histórico, cultural y natural de la provincia donde habita', 'Respetar hacia el patrimonio histórico, cultural y natural de la provincia donde habita.', 40, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T2_13', 'rescate del patrimonio histórico, cultural y natural', 'Asumir actitud positiva el rescate del patrimonio histórico, cultural y natural.', 41, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T2_14', 'hacia las celebraciones de la Patria', 'Respetar hacia las celebraciones de la Patria.', 42, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T2_15', 'raíces de la identidad provincial y nacional', 'Apreciar las raíces de la identidad provincial y nacional.', 43, 2);  -- A

-- 3° — Trimestre III (14 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T3_01', 'El clima de mi provincia', 'Reconocer el clima de mi provincia — incluyendo concepto de clima y estado del tiempo, factores del clima que afectan la provincia, el clima y su influencia en las principales actividades humanas.', 22, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T3_02', 'Nuestra provincia en la Historia de Costa Rica: breve reseña de aportes, de la provincia donde se encuentra el Centro Educativo al país', 'Reconocer nuestra provincia en la Historia de Costa Rica: breve reseña de aportes, de la provincia donde se encuentra el Centro Educativo al país.', 23, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G3_T3_03', 'Celebremos las efemérides en mi provincia', 'Reconocer celebremos las efemérides en mi provincia — incluyendo importancia y relación con el contexto actual.', 24, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T3_04', 'concepto de clima y estado del tiempo para su vivencia en la vida cotidiana', 'Reconocer el concepto de clima y estado del tiempo para su vivencia en la vida cotidiana.', 40, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T3_05', 'factores del clima de la provincia donde habita el estudiante para valorar su influencia en la vida cotidiana', 'Reconocer los factores del clima de la provincia donde habita el estudiante para valorar su influencia en la vida cotidiana.', 41, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T3_06', 'actividades humanas que se desarrollan en la provincia según el clima predominante', 'Identificar las actividades humanas que se desarrollan en la provincia según el clima predominante.', 42, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T3_07', 'historia de la provincia y su aporte en la construcción de la historia de Costa Rica para la valoración ética, estética y ciudadana', 'Comprender la historia de la provincia y su aporte en la construcción de la historia de Costa Rica para la valoración ética, estética y ciudadana.', 43, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G3_T3_08', 'significado de las celebraciones patrias para el fortalecimiento de la identidad provincial y nacional', 'Valorar el significado de las celebraciones patrias para el fortalecimiento de la identidad provincial y nacional.', 44, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T3_09', 'interactúa armónicamente con su entorno social y natural', 'Valorar interactúa armónicamente con su entorno social y natural.', 44, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T3_10', 'climas predominantes en su provincia', 'Apreciar los climas predominantes en su provincia.', 45, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T3_11', 'conciencia de su relación ética e integral con el medio ambiente', 'Valorar conciencia de su relación ética e integral con el medio ambiente.', 46, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T3_12', 'actividades naturales, históricas, políticas, sociales y económicas que se realizan en la provincia', 'Apreciar las actividades naturales, históricas, políticas, sociales y económicas que se realizan en la provincia.', 47, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T3_13', 'hacia las celebraciones de la Patria', 'Respetar hacia las celebraciones de la Patria.', 48, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G3_T3_14', 'raíces de la identidad provincial y nacional', 'Apreciar las raíces de la identidad provincial y nacional.', 49, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 4° (35 ejes)
-- ---------------------------------------------------------------------------

-- 4° — Trimestre I (12 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G4_T1_01', 'Los Estudios Sociales y la Educación Cívica', 'Reconocer los Estudios Sociales y la Educación Cívica — incluyendo definición y su importancia en la vida cotidiana, el papel del arte en los estudios sociales y la educación cívica.', 25, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G4_T1_02', 'Somos parte de la sociedad humana y la Tierra es el lugar donde vivimos', 'Reconocer somos parte de la sociedad humana y la Tierra es el lugar donde vivimos — incluyendo ubicación hemisférica y continental del país, costa rica y sus vecinos, costa rica como parte de una ciudadanía global.', 26, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G4_T1_03', 'Una gran diversidad geográfica en un territorio pequeño', 'Reconocer una gran diversidad geográfica en un territorio pequeño — incluyendo definición e identificación de las principales formas del relieve, características de las formas de relieve más cercanas al centro educativo.', 27, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T1_04', 'definición e importancia de los Estudios Sociales para la construcción de un aprendizaje más significativo', 'Comprender la definición e importancia de los Estudios Sociales para la construcción de un aprendizaje más significativo.', 45, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T1_05', 'Costa Rica en el contexto de la geografía, sociedad y política mundial para valorar la importancia de esta temática', 'Reconocer Costa Rica en el contexto de la geografía, sociedad y política mundial para valorar la importancia de esta temática.', 46, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T1_06', 'características básicas de las formas de relieve', 'Identificar las características básicas de las formas de relieve.', 47, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T1_07', 'características básicas de las formas de relieve cercanas al centro educativo para valorar su importancia', 'Comprender las características básicas de las formas de relieve cercanas al centro educativo para valorar su importancia.', 48, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T1_08', 'aprecia la diversidad geográfica de Costa Rica desde la perspectiva de su origen geológico diverso', 'Valorar aprecia la diversidad geográfica de Costa Rica desde la perspectiva de su origen geológico diverso.', 50, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T1_09', 'interactúa armónicamente con su entorno social y natural', 'Valorar interactúa armónicamente con su entorno social y natural.', 51, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T1_10', 'aprecia las distintas formas del relieve presentes en los contextos regionales y nacionales', 'Valorar aprecia las distintas formas del relieve presentes en los contextos regionales y nacionales.', 52, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T1_11', 'conciencia de su relación ética e integral con el medio ambiente', 'Valorar conciencia de su relación ética e integral con el medio ambiente.', 53, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T1_12', 'paisaje geográfico de Costa Rica', 'Apreciar el paisaje geográfico de Costa Rica.', 54, 1);  -- A

-- 4° — Trimestre II (13 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G4_T2_01', 'Somos parte de una región: las regiones socioeconómicas de Costa Rica', 'Reconocer somos parte de una región: las regiones socioeconómicas de Costa Rica — incluyendo concepto de región, ubicación de las diferentes regiones, características generales de la región donde se ubica mi centro educativo.', 28, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G4_T2_02', 'Vivimos un tiempo: Historia de la región donde se encuentra mi centro educativo', 'Reconocer vivimos un tiempo: Historia de la región donde se encuentra mi centro educativo — incluyendo hechos importantes, personajes representativos de la región, manifestaciones artísticas de la región.', 29, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G4_T2_03', 'Espacios democráticos en mi región', 'Reconocer espacios democráticos en mi región.', 30, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T2_04', 'dinámica de las regiones socioeconómicas para conocer su ubicación y características generales, haciendo énfasis en la que habita el estudiante', 'Reconocer la dinámica de las regiones socioeconómicas para conocer su ubicación y características generales, haciendo énfasis en la que habita el estudiante.', 49, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T2_05', 'historia de la región donde se ubica el centro educativo para valorar sus aportes', 'Comprender la historia de la región donde se ubica el centro educativo para valorar sus aportes.', 50, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T2_06', 'importancia de las instituciones promotoras de los derechos de los y las estudiantes', 'Comprender la importancia de las instituciones promotoras de los derechos de los y las estudiantes para la práctica de actitudes éticas, estéticas y ciudadanas en la región donde se encuentra el centro educativo.', 51, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T2_07', 'identidad cultural de la región', 'Respetar la identidad cultural de la región.', 55, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T2_08', 'apreciar las características históricas, políticas y sociales de la región', 'Valorar apreciar las características históricas, políticas y sociales de la región.', 56, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T2_09', 'interactúa armónicamente con su entorno social, cultural y natural', 'Valorar interactúa armónicamente con su entorno social, cultural y natural.', 57, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T2_10', 'a las leyes y normas relacionadas con los espacios democráticos', 'Respetar a las leyes y normas relacionadas con los espacios democráticos.', 58, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T2_11', 'aspiración por el logro del bienestar socioeconómico', 'Valorar aspiración por el logro del bienestar socioeconómico.', 59, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T2_12', 'valorar los espacios de promoción de los derechos de los y las estudiantes', 'Valorar valorar los espacios de promoción de los derechos de los y las estudiantes.', 60, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T2_13', 'organización institucional del país mediante prácticas éticas y ciudadanas', 'Respetar la organización institucional del país mediante prácticas éticas y ciudadanas.', 61, 2);  -- A

-- 4° — Trimestre III (10 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G4_T3_01', 'Nuestro espacio tiene sus propias características', 'Reconocer nuestro espacio tiene sus propias características — incluyendo climas de costa rica, clima de la región en que se ubica el centro educativo, influencia del clima en la vida cotidiana del estudiante, relación del clima y la biodiversidad de mi región.', 31, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T3_02', 'ubicación de los diferentes climas predominantes de la Región donde se ubica el centro educativo', 'Reconocer la ubicación de los diferentes climas predominantes de la Región donde se ubica el centro educativo.', 52, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T3_03', 'condiciones que determinan el clima de la región donde se ubica el centro educativo para valorar su influencia en la vida de las personas', 'Identificar las condiciones que determinan el clima de la región donde se ubica el centro educativo para valorar su influencia en la vida de las personas.', 53, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T3_04', 'crítico de la relación del clima con la biodiversidad de la región donde se ubica el centro educativo para sensibilizar sobre esta temática', 'Analizar crítico de la relación del clima con la biodiversidad de la región donde se ubica el centro educativo para sensibilizar sobre esta temática.', 54, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G4_T3_05', 'prácticas y actitudes ciudadanas de los y las estudiantes para el fortalecimiento de una relación armoniosa con el ambiente', 'Valorar las prácticas y actitudes ciudadanas de los y las estudiantes para el fortalecimiento de una relación armoniosa con el ambiente.', 55, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T3_06', 'interactúa armónicamente con su entorno social y natural', 'Valorar interactúa armónicamente con su entorno social y natural.', 62, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T3_07', 'paisaje geográfico de Costa Rica', 'Apreciar el paisaje geográfico de Costa Rica.', 63, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T3_08', 'búsqueda de soluciones a la problemática relacionada con las áreas silvestres protegidas', 'Apreciar la búsqueda de soluciones a la problemática relacionada con las áreas silvestres protegidas.', 64, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T3_09', 'actitudes y prácticas ciudadanas de los y las estudiantes en relación con el medio ambiente', 'Respetar las actitudes y prácticas ciudadanas de los y las estudiantes en relación con el medio ambiente.', 65, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G4_T3_10', 'actitudes éticas, estéticas y ciudadanas para el mejoramiento de la calidad de vida de las personas en relación con la naturaleza', 'Vivenciar las actitudes éticas, estéticas y ciudadanas para el mejoramiento de la calidad de vida de las personas en relación con la naturaleza.', 66, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 5° (37 ejes)
-- ---------------------------------------------------------------------------

-- 5° — Trimestre I (16 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G5_T1_01', 'Somos parte de un tiempo histórico: Historia antigua de Costa Rica', 'Reconocer somos parte de un tiempo histórico: Historia antigua de Costa Rica — incluyendo ubicación temporal.', 32, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G5_T1_02', 'Etnias de la Costa Rica antigua', 'Reconocer etnias de la Costa Rica antigua — incluyendo ubicación geográfica, cosmovisión, arte de los pueblos originarios.', 33, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G5_T1_03', 'La situación actual de los pueblos originarios en la Costa Rica del siglo XXI', 'Reconocer la situación actual de los pueblos originarios en la Costa Rica del siglo XXI.', 34, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G5_T1_04', 'Costa Rica: una sociedad intercultural, multiétnica y plurilingüe', 'Reconocer costa Rica: una sociedad intercultural, multiétnica y plurilingüe — incluyendo aporte de los pueblos originarios, afrocostarricenses y asiáticos.', 35, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T1_05', 'temporal de la historia antigua de Costa Rica para visualizar su incidencia en la sociedad actual', 'Identificar temporal de la historia antigua de Costa Rica para visualizar su incidencia en la sociedad actual.', 56, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T1_06', 'características básicas de las principales etnias de la Costa Rica antigua para valorar su importancia', 'Comprender las características básicas de las principales etnias de la Costa Rica antigua para valorar su importancia.', 57, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T1_07', 'principales características de los pueblos originarios para valorar los aportes a la sociedad actual', 'Comprender las principales características de los pueblos originarios para valorar los aportes a la sociedad actual.', 58, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T1_08', 'retos y las circunstancias actuales de nuestros pueblos originarios', 'Comprender los retos y las circunstancias actuales de nuestros pueblos originarios.', 59, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T1_09', 'identidad costarricense desde una perspectiva intercultural, multiétnica y plurilingüe', 'Valorar la identidad costarricense desde una perspectiva intercultural, multiétnica y plurilingüe.', 60, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T1_10', 'aplicar las nociones básicas de cartografía', 'Mostrar interés en aplicar las nociones básicas de cartografía.', 67, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T1_11', 'adecuado del mapa en las prácticas de ubicación geográfica', 'Usar adecuado del mapa en las prácticas de ubicación geográfica.', 68, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T1_12', 'períodos históricos de Costa Rica como parte de un pasado y presente en común', 'Valorar los períodos históricos de Costa Rica como parte de un pasado y presente en común.', 69, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T1_13', 'cultura de los pueblos originarios de Costa Rica', 'Respetar la cultura de los pueblos originarios de Costa Rica.', 70, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T1_14', 'etnias de Costa Rica dentro de su contexto histórico y geográfico', 'Apreciar las etnias de Costa Rica dentro de su contexto histórico y geográfico.', 71, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T1_15', 'prácticas y actitudes respetuosas hacia las etnias originarias de Costa Rica', 'Vivenciar prácticas y actitudes respetuosas hacia las etnias originarias de Costa Rica.', 72, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T1_16', 'hacia la diversidad cultural y lingüística como aporte a la sociedad costarricense actual', 'Apreciar hacia la diversidad cultural y lingüística como aporte a la sociedad costarricense actual.', 73, 1);  -- A

-- 5° — Trimestre II (12 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G5_T2_01', 'El momento del contacto', 'Reconocer el momento del contacto — incluyendo ubicación espacial y temporal, consecuencias de la conquista española en costa rica.', 36, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G5_T2_02', 'La sociedad colonial en Costa Rica', 'Reconocer la sociedad colonial en Costa Rica — incluyendo ubicación espacial y temporal, características generales de la economía, manifestaciones artísticas en la colonia.', 37, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G5_T2_03', 'Los problemas éticos y ciudadanos en la colonia', 'Reconocer los problemas éticos y ciudadanos en la colonia — incluyendo la diferenciación de clases según origen de sangre, la discriminación contra los pueblos originarios y afro descendientes, la esclavitud, la dominación sobre la mujer.', 38, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T2_04', 'impactos culturales, demográficos y sociales de la conquista española', 'Comprender los impactos culturales, demográficos y sociales de la conquista española.', 61, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T2_05', 'ubicación espacial de Costa Rica en el contexto del período colonial', 'Practicar ubicación espacial de Costa Rica en el contexto del período colonial.', 62, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T2_06', 'principales características de la colonia para valorar sus aportes', 'Reconocer las principales características de la colonia para valorar sus aportes.', 63, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T2_07', 'problemas éticos y ciudadanos del período colonial para la construcción de una sociedad igualitaria', 'Comprender los problemas éticos y ciudadanos establecidos en la cotidianidad durante el período colonial para la construcción de una sociedad igualitaria y equitativa.', 64, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T2_08', 'multiculturalidad basada en el respeto y la comprensión hacia la diversidad', 'Valorar la multiculturalidad basada en el respeto y la comprensión hacia la diversidad.', 74, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T2_09', 'autodeterminación y la libertad como elementos vitales para la sociedad democrática', 'Promover la autodeterminación y la libertad como elementos vitales para la sociedad democrática.', 75, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T2_10', 'diversidad y aprecio hacia la otredad', 'Respetar la diversidad y aprecio hacia la otredad.', 76, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T2_11', 'prácticas y actitudes respetuosas hacia el otro y la otra en Costa Rica', 'Vivenciar prácticas y actitudes respetuosas hacia el otro y la otra en Costa Rica.', 77, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T2_12', 'aportes de la sociedad colonial a Costa Rica', 'Valorar los aportes de la sociedad colonial a Costa Rica.', 78, 2);  -- A

-- 5° — Trimestre III (9 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G5_T3_01', 'Los primeros pasos de la vida independiente', 'Reconocer los primeros pasos de la vida independiente — incluyendo la importancia de independencia de costa rica, la importancia del pacto de concordia, la integración territorial de costa rica, construcción de los símbolos nacionales y la identidad nacional actual.', 39, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T3_02', 'crítico sobre la independencia como un proceso histórico cuyos principios democráticos continúan vigentes', 'Analizar crítico sobre la independencia como un proceso histórico cuyos principios democráticos continúan vigentes.', 65, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T3_03', 'Pacto de Concordia como elemento fundamental en la organización republicana del Estado Nación costarricense', 'Reconocer el Pacto de Concordia como elemento fundamental en la organización republicana del Estado Nación costarricense para valorar la importancia de esta temática.', 66, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T3_04', 'importancia geográfica y cultural de la Anexión del Partido de Nicoya a Costa Rica', 'Comprender la importancia geográfica y cultural de la Anexión del Partido de Nicoya a Costa Rica.', 67, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G5_T3_05', 'papel de los símbolos nacionales (Escudo, Bandera e Himno Nacional) dentro de la consolidación del Estado Nación costarricense', 'Comprender el papel de los símbolos nacionales (Escudo, Bandera e Himno Nacional) dentro de la consolidación del Estado Nación costarricense.', 68, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T3_06', 'principios democráticos y su práctica en la cotidianidad', 'Valorar los principios democráticos y su práctica en la cotidianidad.', 79, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T3_07', 'diálogo y la deliberación como mecanismos para la solución de conflictos', 'Apreciar el diálogo y la deliberación como mecanismos para la solución de conflictos.', 80, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T3_08', 'deliberación y autodeterminación de los pueblos', 'Respetar la deliberación y autodeterminación de los pueblos.', 81, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G5_T3_09', 'cooperación sin pérdida de autonomía y soberanía', 'Apreciar la cooperación sin pérdida de autonomía y soberanía.', 82, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 6° (30 ejes)
-- ---------------------------------------------------------------------------

-- 6° — Trimestre I (11 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G6_T1_01', 'Consolidando la independencia de Costa Rica: la Campaña Nacional', 'Reconocer consolidando la independencia de Costa Rica: la Campaña Nacional — incluyendo importancia de la campaña nacional en la construcción de la identidad nacional, ubicación en mapas de las principales batallas y rutas, la defensa de la patria.', 40, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G6_T1_02', 'Sueños de progreso', 'Reconocer sueños de progreso — incluyendo reformas liberales (1870 – 1890).', 41, 1),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T1_03', 'Campaña Nacional como un proceso determinante en la consolidación del Estado Nación', 'Reconocer la Campaña Nacional como un proceso determinante en la consolidación del Estado Nación.', 69, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T1_04', 'principales escenarios de batallas de la Campaña Nacional', 'Identificar los principales escenarios de batallas de la Campaña Nacional.', 70, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T1_05', 'importancia histórica de algunas figuras representativas de la Campaña Nacional y de los héroes del presente', 'Valorar la importancia histórica de algunas figuras representativas de la Campaña Nacional y de los héroes del presente.', 71, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T1_06', 'importancia de las Reformas Liberales a finales del siglo XIX para la consolidación del Estado Nación costarricense', 'Comprender la importancia de las Reformas Liberales a finales del siglo XIX para la consolidación del Estado Nación costarricense.', 72, 1),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T1_07', 'Campaña Nacional como hito en la defensa de la soberanía costarricense', 'Valorar la Campaña Nacional como hito en la defensa de la soberanía costarricense.', 83, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T1_08', 'acción de los personajes involucrados en la Campaña Nacional de acuerdo con los diferentes escenarios', 'Apreciar la acción de los personajes involucrados en la Campaña Nacional de acuerdo con los diferentes escenarios.', 84, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T1_09', 'hacia el manejo y la resolución pacífica de conflictos', 'Asumir actitud positiva hacia el manejo y la resolución pacífica de conflictos.', 85, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T1_10', 'reconocer la influencia de las reformas liberales y su aporte a la sociedad actual', 'Mostrar interés en reconocer la influencia de las reformas liberales y su aporte a la sociedad actual.', 86, 1),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T1_11', 'cultura de la legalidad mediante actitudes éticas, estéticas y ciudadanas', 'Respetar la cultura de la legalidad mediante actitudes éticas, estéticas y ciudadanas.', 87, 1);  -- A

-- 6° — Trimestre II (10 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G6_T2_01', 'Construyendo un Estado Social: reformas sociales de la década de 1940', 'Reconocer construyendo un Estado Social: reformas sociales de la década de 1940 — incluyendo importancia de los logros en.', 42, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G6_T2_02', 'Consolidando un nuevo Estado: la Constitución Política de 1949 de Costa Rica', 'Reconocer consolidando un nuevo Estado: la Constitución Política de 1949 de Costa Rica.', 43, 2),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T2_03', 'logros sociales de la década de 1940 y su impacto en la sociedad actual', 'Comprender los logros sociales de la década de 1940 y su impacto en la sociedad actual.', 73, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T2_04', 'papel de los derechos constitucionalmente establecidos para la construcción de una sociedad democrática', 'Comprender el papel de los derechos constitucionalmente establecidos para la construcción de una sociedad democrática.', 74, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T2_05', 'crítico del impacto de los derechos constitucionales en la vida cotidiana', 'Analizar crítico del impacto de los derechos constitucionales en la vida cotidiana.', 75, 2),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T2_06', 'búsqueda de soluciones a la problemática local o nacional', 'Apreciar la búsqueda de soluciones a la problemática local o nacional.', 88, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T2_07', 'leyes y normas relacionadas con la protección de derechos de los y las estudiantes', 'Respetar las leyes y normas relacionadas con la protección de derechos de los y las estudiantes.', 89, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T2_08', 'participación ciudadana como mecanismo para enfrentar los retos de la sociedad', 'Valorar la participación ciudadana como mecanismo para enfrentar los retos de la sociedad.', 90, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T2_09', 'seguridad social y su función dentro de la sociedad', 'Apreciar la seguridad social y su función dentro de la sociedad.', 91, 2),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T2_10', 'actitudes éticas, estéticas y ciudadanas para el mejoramiento de la calidad de vida de las personas', 'Vivenciar actitudes éticas, estéticas y ciudadanas para el mejoramiento de la calidad de vida de las personas.', 92, 2);  -- A

-- 6° — Trimestre III (9 ejes)
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 1, 'SOC_G6_T3_01', 'Desafíos contemporáneos de la sociedad costarricense', 'Reconocer desafíos contemporáneos de la sociedad costarricense — incluyendo la participación de los y las estudiantes como ciudadanos, prevención del consumo de drogas, convivencia y las redes sociales, medidas básicas para el manejo de las redes sociales.', 44, 3),  -- C
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T3_02', 'retos de la sociedad costarricense como espacios para la participación ciudadana', 'Reconocer los retos de la sociedad costarricense como espacios para la participación ciudadana.', 76, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T3_03', 'crítico de los desafíos contemporáneos de la sociedad costarricense para comprender las responsabilidades de los y las estudiantes', 'Analizar crítico de los desafíos contemporáneos de la sociedad costarricense para comprender las responsabilidades de los y las estudiantes.', 77, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T3_04', 'desafíos contemporáneos de la sociedad costarricense para la formación ética y humanista de los y las estudiantes', 'Valorar los desafíos contemporáneos de la sociedad costarricense para la formación ética y humanista de los y las estudiantes.', 78, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 2, 'SOC_G6_T3_05', 'importancia de los desafíos de la sociedad costarricense para la práctica de actitudes éticas, estéticas y ciudadanas', 'Reconocer la importancia de los desafíos de la sociedad costarricense para la práctica de actitudes éticas, estéticas y ciudadanas.', 79, 3),  -- P
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T3_06', 'participación ciudadana para enfrentar los retos planteados por los desafíos de la sociedad costarricense', 'Promover la participación ciudadana para enfrentar los retos planteados por los desafíos de la sociedad costarricense.', 93, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T3_07', 'actitudes éticas, estéticas y ciudadanas para el mejoramiento de la calidad de vida de las personas', 'Vivenciar actitudes éticas, estéticas y ciudadanas para el mejoramiento de la calidad de vida de las personas.', 94, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T3_08', 'aspiración al logro del bienestar social, político, ambiental y económico de Costa Rica', 'Valorar aspiración al logro del bienestar social, político, ambiental y económico de Costa Rica.', 95, 3),  -- A
((SELECT id FROM materias WHERE clave='ESTUDIOS_SOCIALES'), 3, 'SOC_G6_T3_09', 'hacia la búsqueda de soluciones frente a los desafíos de la sociedad contemporánea costarricense', 'Asumir actitud positiva hacia la búsqueda de soluciones frente a los desafíos de la sociedad contemporánea costarricense.', 96, 3);  -- A


-- ============================================================================
-- 3) Vincular cada eje a su grado correspondiente (ejes_tematicos_niveles)
--    Cada eje de Estudios Sociales aplica a UN solo grado (el de su clave SOC_G{n}_*).
-- ============================================================================

-- Grado 1° → todos los ejes con clave SOC_G1_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'SOC_G1_%'
  AND n.numero_grado = 1
ON CONFLICT DO NOTHING;

-- Grado 2° → todos los ejes con clave SOC_G2_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'SOC_G2_%'
  AND n.numero_grado = 2
ON CONFLICT DO NOTHING;

-- Grado 3° → todos los ejes con clave SOC_G3_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'SOC_G3_%'
  AND n.numero_grado = 3
ON CONFLICT DO NOTHING;

-- Grado 4° → todos los ejes con clave SOC_G4_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'SOC_G4_%'
  AND n.numero_grado = 4
ON CONFLICT DO NOTHING;

-- Grado 5° → todos los ejes con clave SOC_G5_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'SOC_G5_%'
  AND n.numero_grado = 5
ON CONFLICT DO NOTHING;

-- Grado 6° → todos los ejes con clave SOC_G6_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'SOC_G6_%'
  AND n.numero_grado = 6
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4) Verificación final (opcional, queda como comentario informativo)
-- ============================================================================
--   SELECT COUNT(*) FROM ejes_tematicos
--   WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESTUDIOS_SOCIALES');
--   -- Debe devolver 219
--
--   SELECT periodo_numero, tipo_saber_id, COUNT(*)
--   FROM ejes_tematicos
--   WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESTUDIOS_SOCIALES')
--   GROUP BY periodo_numero, tipo_saber_id
--   ORDER BY periodo_numero, tipo_saber_id;
--
--   SELECT n.numero_grado, e.periodo_numero, COUNT(*)
--   FROM ejes_tematicos e
--   JOIN ejes_tematicos_niveles en ON en.eje_tematico_id = e.id
--   JOIN niveles n ON n.id = en.nivel_id
--   WHERE e.materia_id = (SELECT id FROM materias WHERE clave = 'ESTUDIOS_SOCIALES')
--   GROUP BY n.numero_grado, e.periodo_numero
--   ORDER BY n.numero_grado, e.periodo_numero;
