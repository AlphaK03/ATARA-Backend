-- =============================================================================
-- V20: Ejes temáticos de ESPAÑOL alineados al currículo MEP CR (I y II Ciclo)
--
-- Cambio principal:
--   Hasta V4/V13, Español tenía 21 ejes genéricos (C_FONOLOGICA, P_FONOLOGICA,
--   A_FONOLOGICA, C_COMPRENSION, ..., A_EXPRESION_ORAL) creados en V4 y mapeados
--   a niveles por V13. Esos 21 ejes aplicaban a varios grados sin distinción
--   de trimestre y NO reflejaban el currículo oficial del MEP.
--
-- Solución (mismo patrón aplicado en V17/V18/V19):
--   1. NO se vuelve a agregar la columna `periodo_numero` ni el CHECK constraint;
--      ya fueron creados en V17.
--   2. Se ELIMINAN los 21 ejes genéricos previos de Español y sus relaciones
--      dependientes.
--   3. Se INSERTAN 198 ejes nuevos para Español, distribuidos así:
--        6 grados (1°-6°) × 3 trimestres × 11 ejes = 198
--      Mismo conteo que V17 (Ciencias) y V19 (Matemática).
--      Cada eje es un criterio evaluable individual (un verbo + un saber)
--      derivado del programa MEP Español I y II Ciclo.
--   4. Se vincula cada eje a su grado correspondiente vía ejes_tematicos_niveles.
--   5. NO se vuelve a recrear la vista vw_ejes_por_materia_nivel (ya por V17).
--
-- Mapeo MEP → grados (1° y 2° comparten unidades en el currículo de Español):
--   - 1°: Unidad de Comprensión y Expresión Oral + Primera unidad de lectoescritura
--   - 2°: Unidad de Articulación + Segunda unidad de lectoescritura
--   - 3°: Unidad de tercer año
--   - 4°: Unidad de cuarto año
--   - 5°: Unidad de quinto año
--   - 6°: Unidad de sexto año
--
-- Clasificación tipo_saber (basada en verbo de inicio del criterio):
--   - Conceptual (1)   : Reconocer, Identificar, Describir, Comprender, ...
--   - Procedimental (2): Aplicar, Utilizar, Construir, Leer, Escribir,
--                        Interpretar, Producir, Practicar, Analizar, ...
--   - Actitudinal (3)  : Valorar, Apreciar, Tomar conciencia, Respetar,
--                        Disfrutar, Mostrar interés, Mostrar sensibilidad, ...
--
-- Convención de clave: ESP_G{grado}_T{trimestre}_{pos:02d}
--   Ejemplo: ESP_G1_T1_01, ESP_G4_T2_05, ESP_G6_T3_11
--
-- Filtrado esperado en el wizard de evaluación:
--   SELECT * FROM ejes_tematicos e
--   JOIN ejes_tematicos_niveles en ON en.eje_tematico_id = e.id
--   WHERE e.materia_id = (SELECT id FROM materias WHERE clave='ESPANOL')
--     AND en.nivel_id = :grade_nivel_id
--     AND (e.periodo_numero = :trimestre OR e.periodo_numero IS NULL)
--   ORDER BY e.tipo_saber_id, e.orden;
-- =============================================================================

-- ============================================================================
-- 1) Limpiar ejes anteriores de ESPAÑOL
--    El cascade no aplica aquí porque algunas FKs no tienen ON DELETE CASCADE,
--    así que limpiamos en orden inverso de dependencias.
-- ============================================================================

-- 1a) Borrar detalles de evaluación que referencian ejes de Español
DELETE FROM detalle_evaluacion_saber
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESPANOL')
);

-- 1b) Borrar alertas temáticas de Español
DELETE FROM alertas_tematicas
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESPANOL')
);

-- 1c) Borrar relaciones eje ↔ nivel para Español
DELETE FROM ejes_tematicos_niveles
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESPANOL')
);

-- 1d) Borrar los 21 ejes genéricos antiguos de Español
DELETE FROM ejes_tematicos
WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESPANOL');

-- ============================================================================
-- 2) Insertar 198 ejes nuevos para ESPAÑOL (orden MEP)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- GRADO 1° — Trimestre I (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T1_01', 'Fonemas que componen las palabras (conciencia fonológica) reconociendo', 'Identificar los fonemas que componen las palabras (conciencia fonológica) reconociendo, separando, y combinando sus fonemas y sílabas.', 1, 1),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T1_02', 'Discriminación de un fonema o patrones de fonema en las palabras', 'Discriminación de un fonema o patrones de fonema en las palabras.', 1, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T1_03', 'Fonema(s) inicial (es) y final (es) de las palabras', 'Identificar del fonema(s) inicial (es) y final (es) de las palabras.', 2, 1),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T1_04', 'Estrategias auditivas', 'Aplicar estrategias auditivas, visuales, comunicativas, motoras finas y motora gruesa en el lenguaje oral.', 2, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G1_T1_05', 'Empleo de los fonemas de la lengua en la expresión y comprensión oral', 'Valorar empleo de los fonemas de la lengua en la expresión y comprensión oral.', 1, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T1_06', 'Diversos textos literarios', 'Reconstruir diversos textos literarios: cuentos, poemas, leyendas, otros, a partir de aspectos evidenciados en la portada, las ilustraciones, entre otros.', 3, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T1_07', 'Diversos textos no literarios', 'Reconocer diversos textos no literarios: noticias, anuncios publicitarios, correos electrónicos, recetas de cocina, nombres de empresas comerciales, entre otros; a partir de aspectos evidenciados en el formato, letras, palabras conocidas, otros.', 3, 1),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T1_08', 'Propósito comunicativo en los textos escuchados', 'Reconocer del propósito comunicativo en los textos escuchados, tales como: narraciones, poemas, para aprender y entretenerse; avisos y noticias para informarse o aprender; invitaciones, recados, cartas, correos electrónicos, otros, para...', 4, 1),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T1_09', 'Diversos elementos lingüísticos y paralingüísticos en la producción de textos orales de ac', 'Aplicar los diversos elementos lingüísticos y paralingüísticos en la producción de textos orales de acuerdo con los propósitos comunicativos.', 4, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T1_10', 'Comprensiva de textos literarios', 'Escuchar comprensiva de textos literarios: cuentos, fábulas, leyendas, poemas, piezas musicales, entre otras; con temáticas significativas, interesándose y disfrutando de la literatura; habituándose a ella.', 5, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G1_T1_11', 'Tomar conciencia las características específicas de las diferentes situaciones comunicativ', 'Tomar conciencia las características específicas de las diferentes situaciones comunicativas (formales e informales, silencio – ruido y necesidad de escuchar).', 2, 1);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 1° — Trimestre II (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G1_T2_01', 'Escucha (atenta comprensiva y apreciativa) de audiciones musicales', 'Mostrar sensibilidad ante la escucha (atenta comprensiva y apreciativa) de audiciones musicales, textos literarios, informativos y funcionales.', 3, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G1_T2_02', 'Empleo de vocabulario creciente en la expresión y comprensión oral', 'Valorar por el empleo de vocabulario creciente en la expresión y comprensión oral.', 4, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T2_03', 'Estrategias de articulación entre la Educación Preescolar y el primer año de la Educación', 'Utilizar estrategias de articulación entre la Educación Preescolar y el primer año de la Educación General Básica.', 6, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T2_04', 'Estrategias que buscan fomentar la lectura apreciativa de variedad de textos literarios y', 'Aplicar estrategias que buscan fomentar la lectura apreciativa de variedad de textos literarios y no literarios al leerlos y producirlos en forma habitual.', 7, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T2_05', 'Hábitos lectores', 'Adquirir hábitos lectores.', 8, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T2_06', 'Sonidos e imágenes provenientes de diversas fuentes y entornos sonoros y visuales', 'Interpretar sonidos e imágenes provenientes de diversas fuentes y entornos sonoros y visuales.', 9, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T2_07', '(gradual) de la correspondencia entre fonema y letra', 'Reconocer (gradual) de la correspondencia entre fonema y letra.', 5, 2),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T2_08', 'Correspondencia fonema- sílaba', 'Comprender la correspondencia fonema- sílaba; sílaba-letra y letra- palabra.', 6, 2),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T2_09', 'Establecimiento de las correspondencias entre partes de escritura y partes de oralidad al', 'Establecimiento de las correspondencias entre partes de escritura y partes de oralidad al tratar de leer enunciados (palabras, frases y oraciones).', 10, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T2_10', 'Letras pertinentes para tratar de escribir determinados enunciados (palabras', 'Identificar las letras pertinentes para tratar de escribir determinados enunciados (palabras, frases y oraciones).', 7, 2),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T2_11', 'Experimentación de lectura al decodificar enunciados (palabras', 'Experimentación de lectura al decodificar enunciados (palabras, frases y oraciones).', 11, 2);  -- P

-- ---------------------------------------------------------------------------
-- GRADO 1° — Trimestre III (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T3_01', 'Letras que contiene cada enunciado', 'Identificar las letras que contiene cada enunciado.', 8, 3),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T3_02', 'Conocimiento de la correspondencia letra-fonema al formar enunciados (palabras', 'Utilizar del conocimiento de la correspondencia letra-fonema al formar enunciados (palabras, frases y oraciones) en textos escritos.', 12, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G1_T3_03', 'Crítica y reflexiva del entorno sonoro y letrado', 'Valorar crítica y reflexiva del entorno sonoro y letrado.', 5, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G1_T3_04', 'Expresión escrita de las letras', 'Disfrutar la expresión escrita de las letras.', 6, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T3_05', 'Experimentación con la escritura del trazado de letras y palabras', 'Experimentación con la escritura del trazado de letras y palabras.', 13, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T3_06', 'Lectura de textos literarios y no literarios (notas', 'Comprender lectura de textos literarios y no literarios (notas, mensajes informativos, instrucciones), escritos con oraciones cortas o propias de otras asignaturas.', 9, 3),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T3_07', 'Concepto de escritura', 'Reconocer del concepto de escritura.', 10, 3),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T3_08', 'Producciones de textos descriptivos y explicativos', 'Realizar producciones de textos descriptivos y explicativos, en forma escrita y oral (con oraciones cortas pero de significado completo) para la comunicación e información. Para lo anterior se proponen los talleres de escritura y lectura creativa...', 14, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G1_T3_09', 'Significado global de textos orales', 'Comprender del significado global de textos orales.', 11, 3),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T3_10', 'Exposiciones sobre temas de interés', 'Realizar exposiciones sobre temas de interés.', 15, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G1_T3_11', 'Recitaciones de rimas', 'Realizar recitaciones de rimas, rondas, canciones, adivinanzas, trabalenguas y otras formas literarias.', 16, 3);  -- P

-- ---------------------------------------------------------------------------
-- GRADO 2° — Trimestre I (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T1_01', 'Estrategias de reconocimiento', 'Utilizar estrategias de reconocimiento, comprensión y aplicación para el desarrollo de habilidades de conciencia fonológica al formar enunciados (palabras, frases y oraciones).', 17, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T1_02', 'Crítica y reflexiva del entorno sonoro y letrado', 'Valorar crítica y reflexiva del entorno sonoro y letrado.', 7, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T1_03', 'Expresión escrita de las letras', 'Disfrutar la expresión escrita de las letras.', 8, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T1_04', 'Potenciar las propias posibilidades auditivas', 'Mostrar interés en potenciar las propias posibilidades auditivas, de expresión escrita y lectura de las letras.', 9, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T1_05', '(en forma progresiva', 'Adquirir (en forma progresiva, gradual y habitual) de la fluidez en la comprensión de lectura.', 18, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G2_T1_06', 'Textos no literarios', 'Comprender textos no literarios, escritos con oraciones pequeñas y propias de otras asignaturas. (notas, mensajes informativos, instrucciones, entre otros).', 12, 1),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G2_T1_07', 'Concepto de escritura', 'Reconocer del concepto de escritura.', 13, 1),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T1_08', 'Producciones de texto escrito y oral', 'Realizar producciones de texto escrito y oral, descriptivo y explicativo con enunciados cortos pero de significado completo, para la comunicación de la información.', 19, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T1_09', 'Diversas manifestaciones del lenguaje y expresión oral', 'Realizar de: recitaciones, rimas, rondas, canciones, adivinanzas, trabalenguas, exposiciones sobre temas de interés y otras formas literarias y no literarias. Todo lo anterior, utilizando diversas manifestaciones del lenguaje oral y comprendiendo...', 20, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T1_10', 'Técnicas elementales de inducción en la iniciación del año escolar', 'Utilizar técnicas elementales de inducción en la iniciación del año escolar.', 21, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T1_11', 'Mostrar interés y actitud positiva frente hacia la lectura de textos', 'Mostrar interés y actitud positiva frente hacia la lectura de textos, orientada al disfrute y al gozo.', 10, 1);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 2° — Trimestre II (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T2_01', 'Estrategias que buscan fomentar la lectura apreciativa de textos literarios y no literario', 'Aplicar estrategias que buscan fomentar la lectura apreciativa de textos literarios y no literarios al leer y producir variedad de textos en forma habitual.', 22, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T2_02', 'Mostrar interés y una actitud de gozo y disfrute frente a la lectura', 'Mostrar interés y una actitud de gozo y disfrute frente a la lectura.', 11, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T2_03', 'Hábitos lectores', 'Adquirir hábitos lectores.', 23, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T2_04', 'Leer diversos tipos de textos de acuerdo con su curiosidad y necesidades', 'Disfrutar de leer diversos tipos de textos de acuerdo con su curiosidad y necesidades.', 12, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T2_05', 'Lectura de textos literarios', 'Interpretar la lectura de textos literarios: • cuentos, • poemas, • fábulas, • leyendas, • otros.', 24, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T2_06', 'Crítica ante la lectura del texto', 'Mostrar actitud crítica ante la lectura del texto.', 13, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G2_T2_07', 'Características', 'Reconocer las características, estructura y elementos de textos expositivos, narrativos y descriptivos.', 14, 2),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T2_08', '(por sí mismo) de pequeños textos expositivos', 'Elaborar (por sí mismo) de pequeños textos expositivos, narrativos y descriptivos en los cuales se visualice claramente la estructura del tipo de texto estudiado.', 25, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T2_09', 'Para desarrollar el punto', 'Para desarrollar el punto.', 26, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T2_10', 'Se implementan talleres de escritura y lectura creativa que se encuentran al final del pro', 'Se implementan talleres de escritura y lectura creativa que se encuentran al final del programa, como documento anexo.', 27, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T2_11', 'Disponerse para valorar los textos literarios en forma imaginativa y creativa', 'Disponerse para Valorar textos literarios en forma imaginativa y creativa.', 14, 2);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 2° — Trimestre III (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T3_01', 'Reflexión hacia la fluidez en la comprensión lectora', 'Reflexión hacia la fluidez en la comprensión lectora.', 28, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T3_02', 'Importancia de la fluidez lectora para la comprensión', 'Valorar importancia de la fluidez lectora para la comprensión.', 15, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T3_03', 'Estrategias de planificación (propósito', 'Utilizar estrategias de planificación (propósito, destinatario, mensaje, estructura), textualización, elaboración y revisión al escribir variedad de textos.', 29, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T3_04', 'Sentido crítico ante la producción escrita propia y la de otros', 'Sentido crítico ante la producción escrita propia y la de otros.', 30, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T3_05', 'Calidad de textos escritos (propios y ajenos)', 'Disfrutar de calidad de textos escritos (propios y ajenos).', 16, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T3_06', 'Estrategias de reconocimiento y aplicación de las letras', 'Utilizar estrategias de reconocimiento y aplicación de las letras.', 31, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G2_T3_07', 'Escritura artística de las letras', 'Disfrutar de escritura artística de las letras.', 17, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T3_08', 'Estrategias de reconocimiento y de comprensión de textos informativos (panfletos', 'Utilizar estrategias de reconocimiento y de comprensión de textos informativos (panfletos, manuales, anuncios publicitarios).', 32, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T3_09', 'Deseo por satisfacer sus necesidades de comunicación', 'Deseo por satisfacer sus necesidades de comunicación.', 33, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G2_T3_10', 'Global de diversos textos orales de carácter literario o no literario empleando elementos', 'Comprender global de diversos textos orales de carácter literario o no literario empleando elementos lingüísticos y paralingüísticos.', 15, 3),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G2_T3_11', 'Expresión oral utilizando técnicas expositivas (debates', 'Ejercitar la expresión oral utilizando técnicas expositivas (debates, foros, presentación de temas investigativos variados).', 34, 3);  -- P

-- ---------------------------------------------------------------------------
-- GRADO 3° — Trimestre I (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T1_01', 'Técnicas elementales de inducción en el inicio del año escolar', 'Utilizar técnicas elementales de inducción en el inicio del año escolar.', 35, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T1_02', 'Influencia de las condiciones de vida escolares', 'Mostrar sensibilidad ante la influencia de las condiciones de vida escolares.', 18, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T1_03', 'Crítica ante los factores y prácticas sociales escolares que favorecen el desarrollo human', 'Mostrar actitud crítica ante los factores y prácticas sociales escolares que favorecen el desarrollo humano y el comportamiento responsable.', 19, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T1_04', 'Estrategias que buscan fomentar la lectura apreciativa de textos literarios y no literario', 'Aplicar estrategias que buscan fomentar la lectura apreciativa de textos literarios y no literarios al leer y producir, en forma habitual, variedad de textos.', 36, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T1_05', 'Interés y una actitud de gozo u orientada al disfrute frente a la lectura', 'Demostrar interés y una actitud de gozo u orientada al disfrute frente a la lectura.', 37, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T1_06', 'Adquiere hábitos lectores', 'Adquiere hábitos lectores.', 38, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T1_07', 'Leer diversos tipos de textos de acuerdo con su curiosidad y necesidades', 'Disfrutar de leer diversos tipos de textos de acuerdo con su curiosidad y necesidades.', 20, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T1_08', 'Lectura de textos literarios', 'Analizar la lectura de textos literarios: • Cuentos. • Poemas. • Fábulas. • Leyendas. • Teatro.', 39, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T1_09', 'Manifiesta actitud crítica ante la lectura del texto literario', 'Manifiesta actitud crítica ante la lectura del texto literario.', 40, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G3_T1_10', 'Características', 'Reconocer las características, estructura, elementos de los textos informativos, narrativos, expositivos y descriptivos.', 16, 1),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T1_11', 'Valorar el mundo literario en forma imaginativa y creativa', 'Disponerse a Valorar mundo literario en forma imaginativa y creativa.', 21, 1);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 3° — Trimestre II (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T2_01', 'Estrategias de inferencia a partir de la información textual', 'Aplicar estrategias de inferencia a partir de la información textual: títulos, el prólogo, el índice, el cuerpo del libro, nombre del autor, portada, dedicatoria y epígrafe.', 41, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T2_02', 'Lectura como fuente de placer y diversión', 'Valorar lectura como fuente de placer y diversión.', 22, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T2_03', 'Formación de criterios y gustos literarios', 'Formación de criterios y gustos literarios.', 42, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T2_04', 'Desarrollo de la iniciativa en el proceso de lectura', 'Desarrollo de la iniciativa en el proceso de lectura.', 43, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T2_05', 'Formulación de opiniones argumentativas en las que se identifique claramente la situación', 'Formulación de opiniones argumentativas en las que se identifique claramente la situación problemática a favor y en contra y la conclusión del autor. Todo lo anterior, apoyándose en la información explícita e implícita. • Análisis del problema y...', 44, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T2_06', 'Lectura como fuente de placer y diversión', 'Valorar lectura como fuente de placer y diversión.', 23, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T2_07', 'Formación de criterios y gustos literarios', 'Formación de criterios y gustos literarios.', 45, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T2_08', 'Desarrollo de la iniciativa en la lectura', 'Desarrollo de la iniciativa en la lectura.', 46, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T2_09', 'Vocabulario como medio para lograr un mejor uso del lenguaje', 'Valorar vocabulario como medio para lograr un mejor uso del lenguaje.', 24, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T2_10', 'Extracción del significado de las palabras por diversos medios', 'Extracción del significado de las palabras por diversos medios.', 47, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T2_11', 'Discriminación de la información relevante', 'Discriminación de la información relevante, visualizada en diversas fuentes, para el desarrollo de un tema por investigar.', 48, 2);  -- P

-- ---------------------------------------------------------------------------
-- GRADO 3° — Trimestre III (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T3_01', 'Calidad de los textos propios y ajenos como medio para asegurar una comunicación fluida y', 'Mostrar interés en la calidad de los textos propios y ajenos como medio para asegurar una comunicación fluida y clara.', 25, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T3_02', 'Normas básicas del lenguaje', 'Respetar las normas básicas del lenguaje.', 26, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T3_03', 'Habilidades lingüísticas y no lingüísticas de las normas propias del intercambio comunicat', 'Aplicar las habilidades lingüísticas y no lingüísticas de las normas propias del intercambio comunicativo.', 49, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T3_04', 'Normas de convivencia social', 'Valorar normas de convivencia social.', 27, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 1, 'ESP_G3_T3_05', 'Significado global de textos orales', 'Comprender del significado global de textos orales: instrucciones, relatos, anécdotas, documentales, bombas, frases célebres, dramatizaciones, dichos populares, rimas, rondas, canciones, adivinanzas, trabalenguas.', 17, 3),  -- C
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T3_06', 'Experimentación en representaciones de roles y recitaciones', 'Experimentación en representaciones de roles y recitaciones.', 50, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T3_07', 'Expresión oral utilizando técnicas expositivas variadas', 'Ejercitar la expresión oral utilizando técnicas expositivas variadas. Ejemplo: • Elaboración de la información expresada. • Reelaboración de la información expresada.', 51, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T3_08', 'Vocabulario básico ortográfico aprendido en función de la producción textual', 'Aplicar del vocabulario básico ortográfico aprendido en función de la producción textual.', 52, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T3_09', 'Estructuras gramaticales en la producción de textos', 'Aplicar las estructuras gramaticales en la producción de textos.', 53, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G3_T3_10', 'Normas básicas de escritura en la producción textual', 'Aplicar las normas básicas de escritura en la producción textual. CIUDAD ANIMAL.', 54, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G3_T3_11', 'Comprensión de textos orales para la convivencia', 'Valorar comprensión de textos orales para la convivencia.', 28, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 4° — Trimestre I (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T1_01', 'Técnicas elementales de inducción en la iniciación del año escolar', 'Utilizar técnicas elementales de inducción en la iniciación del año escolar.', 55, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T1_02', 'Influencia de las condiciones de vida escolar', 'Mostrar sensibilidad ante la influencia de las condiciones de vida escolar.', 29, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T1_03', 'Crítica ante los factores y prácticas sociales escolares que favorecen el desarrollo human', 'Mostrar actitud crítica ante los factores y prácticas sociales escolares que favorecen el desarrollo humano y el comportamiento responsable. 3. Autoevaluación.', 30, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T1_04', 'Leer el borrador', 'Leer el borrador.', 56, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T1_05', 'Reordenar', 'Reordenar, omitir y agregar información.', 57, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T1_06', 'Solicitar a un compañero(a) la lectura del texto', 'Solicitar a un compañero(a) la lectura del texto.', 58, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T1_07', 'Técnicas personales de lectura silenciosa y dirigida en el desarrollo del gusto por leer', 'Utilizar técnicas personales de lectura silenciosa y dirigida en el desarrollo del gusto por leer.', 59, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T1_08', 'Hábito de leer como necesidad personal que lleva al disfrute', 'Valorar hábito de leer como necesidad personal que lleva al disfrute.', 31, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T1_09', 'Estrategias de interpretación de obras de arte plástico en el desarrollo de procesos de ob', 'Aplicar estrategias de interpretación de obras de arte plástico en el desarrollo de procesos de observación, indagación, diálogo, descripción y reflexión.', 60, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T1_10', 'Lectura', 'Disfrutar de lectura.', 32, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T1_11', 'Mostrar sensibilidad estética', 'Mostrar sensibilidad estética.', 33, 1);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 4° — Trimestre II (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T2_01', 'Diferentes tipos de textos (expositivos', 'Utilizar diferentes tipos de textos (expositivos, narrativos y descriptivos), que sirvan como modelo para diversos propósitos en la producción textual oral y escrita (noticias, el periódico, recados, instrucciones, cuentos, adivinanzas,...', 61, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T2_02', 'Sus compañeros (as) los textos escritos', 'Comparte con sus compañeros (as) los textos escritos, leídos y escuchados.', 34, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T2_03', 'Texto oral y escrito como instrumento de búsqueda de conocimientos nuevos', 'Valorar texto oral y escrito como instrumento de búsqueda de conocimientos nuevos, como medio de diversión y entretenimiento y como vehículo de transmisión cultural.', 35, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T2_04', 'Calidad de textos orales y escritos', 'Disfrutar de calidad de textos orales y escritos, propios y ajenos.', 36, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T2_05', 'Estrategias de comprensión lectora (conocimientos previos', 'Utilizar estrategias de comprensión lectora (conocimientos previos, relectura, subrayado, ideas fundamentales y complementarias, resumen, recapitulación y otras).', 62, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T2_06', 'Lectura de textos literarios', 'Interpretar la lectura de textos literarios.', 63, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T2_07', 'Diversas fuentes informativas (biblioteca', 'Utilizar diversas fuentes informativas (biblioteca, ficheros de la biblioteca, internet, entrevistas, documentales, guía telefónica, entre otros) para la investigación de diversos temas.', 64, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T2_08', 'Despierta el gusto por la búsqueda de información', 'Despierta el gusto por la búsqueda de información.', 65, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T2_09', 'Muestra interés por la búsqueda de fuentes comunicativas de información', 'Muestra interés por la búsqueda de fuentes comunicativas de información.', 66, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T2_10', 'Positiva y optimista sobre la propia capacidad para aprender y comprender la lectura', 'Mostrar actitud positiva y optimista sobre la propia capacidad para aprender y comprender la lectura.', 37, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T2_11', 'Crítica frente a la lectura de los textos literarios', 'Mostrar actitud crítica frente a la lectura de los textos literarios.', 38, 2);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 4° — Trimestre III (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T3_01', 'Escucha atenta y comprensiva de los textos orales', 'Valorar por la escucha atenta y comprensiva de los textos orales.', 39, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T3_02', 'Crítica frente a la comprensión oral de los textos', 'Mostrar actitud crítica frente a la comprensión oral de los textos.', 40, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T3_03', 'Expresión oral utilizando técnicas tales como exposiciones', 'Ejercitar la expresión oral utilizando técnicas tales como exposiciones, debates, foros, panel, mesa redonda, cine foro, dramatizaciones, juegos de roles, entre otros. perfect perfect alumno multim multi multi parto parto Raíz de la palabra...', 67, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T3_04', 'Expresión oral como actividad que fomenta confianza en sí y nuevos aprendizajes', 'Disfrutar la expresión oral como actividad que fomenta confianza en sí y nuevos aprendizajes.', 41, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T3_05', 'Identifica la estructura de los textos leídos', 'Identifica la estructura de los textos leídos.', 68, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T3_06', 'Señala oralmente elementos de los textos leídos', 'Señala oralmente elementos de los textos leídos.', 69, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T3_07', 'Completa el esquema con la información solicitada del texto', 'Completa el esquema con la información solicitada del texto.', 70, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T3_08', 'Construye textos siguiendo la estructura indicada', 'Construye textos siguiendo la estructura indicada.', 71, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T3_09', 'Incorpora frases con sentido figurado en el texto construido', 'Incorpora frases con sentido figurado en el texto construido. Otra información de acuerdo con el juicio del docente.', 72, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G4_T3_10', 'Comunicarse mediante la participación en actividades de expresión oral', 'Disfrutar de comunicarse mediante la participación en actividades de expresión oral. o ible funciones familiar color Sufijo Futuro futuro Estrategias de evaluación sugeridas Estrategias de evaluación sugeridas Durante el desarrollo de las...', 42, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G4_T3_11', 'Volverse rico', 'Volverse rico.', 73, 3);  -- P

-- ---------------------------------------------------------------------------
-- GRADO 5° — Trimestre I (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T1_01', 'Técnicas elementales de inducción en la iniciación del año escolar', 'Utilizar técnicas elementales de inducción en la iniciación del año escolar.', 74, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T1_02', 'Influencia de las condiciones de vida escolar', 'Mostrar sensibilidad ante la influencia de las condiciones de vida escolar.', 43, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T1_03', 'Crítica ante los factores y prácticas sociales escolares que favorecen el desarrollo human', 'Mostrar actitud crítica ante los factores y prácticas sociales escolares que favorecen el desarrollo humano y el comportamiento responsable.', 44, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T1_04', 'Técnicas personales de lectura silenciosa y dirigida en el desarrollo del gusto por leer', 'Utilizar técnicas personales de lectura silenciosa y dirigida en el desarrollo del gusto por leer.', 75, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T1_05', 'Hábito de leer como necesidad personal que lleva al disfrute', 'Valorar hábito de leer como necesidad personal que lleva al disfrute.', 45, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T1_06', 'Estrategias de interpretación de obras de arte plástico en el desarrollo de procesos de ob', 'Aplicar estrategias de interpretación de obras de arte plástico en el desarrollo de procesos de observación, indagación, diálogo, descripción, reflexión, entre otros.', 76, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T1_07', 'Modelos de textos explicativos', 'Utilizar modelos de textos explicativos, narrativos, argumentativos, informativos, normativos y publicitarios para la producción textual.', 77, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T1_08', 'Estrategias de exposición oral (resumir', 'Aplicar estrategias de exposición oral (resumir, repetir, resaltar las ideas para la comprensión textual) por parte de los interlocutores.', 78, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T1_09', 'Lectura apreciativa de textos literarios', 'Mostrar sensibilidad ante la lectura apreciativa de textos literarios.', 46, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T1_10', 'Diálogo como herramienta que permite superar los conflictos y mostrar respeto hacia las pe', 'Valorar diálogo como herramienta que permite superar los conflictos y mostrar respeto hacia las personas, creencias y opiniones distintas a las propias en la conducta habitual y en el uso del lenguaje.', 47, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T1_11', 'Arte plástico visual como instrumento que permite múltiples interpretaciones', 'Valorar arte plástico visual como instrumento que permite múltiples interpretaciones.', 48, 1);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 5° — Trimestre II (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T2_01', 'Crítica y propositiva ante los mensajes orales escuchados con el propósito de contribuir e', 'Mostrar actitud crítica y propositiva ante los mensajes orales escuchados con el propósito de contribuir en la construcción de los significados compartidos.', 49, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T2_02', '(contextualizada y oportuna) del vocabulario básico ortográfico y del vocabulario general', 'Ejercitar (contextualizada y oportuna) del vocabulario básico ortográfico y del vocabulario general de la lengua en las producciones textuales, tanto orales como escritas.', 79, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T2_03', 'Positiva hacia el aprendizaje', 'Mostrar actitud positiva hacia el aprendizaje, uso de la ortografía y afán de perfeccionamiento en ella para solventar las dudas y rechazar los errores.', 50, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T2_04', 'Crítica frente al uso del vocabulario en diversas situaciones y sus efectos en la comunica', 'Mostrar actitud crítica frente al uso del vocabulario en diversas situaciones y sus efectos en la comunicación.', 51, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T2_05', 'Estrategias de reconocimiento de los diversos géneros literarios (poesía', 'Utilizar estrategias de reconocimiento de los diversos géneros literarios (poesía, cuento, novela, drama, leyenda) e identificación del lenguaje figurado en: adivinanzas, trabalenguas, bombas, refranes, frases célebres y dichos populares para la...', 80, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T2_06', 'Gozo por la lectura de diversos géneros literarios y otras formas de expresión lingüística', 'Gozo por la lectura de diversos géneros literarios y otras formas de expresión lingüística que forman parte la cultura.', 81, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T2_07', 'Estrategias de interpretación (inferencias', 'Aplicar estrategias de interpretación (inferencias, hipótesis, conjeturas, analogías, conclusiones, proposiciones) para captar el sentido global del texto.', 82, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T2_08', 'Estrategias de interpretación de los mensajes generados en los medios de comunicación para', 'Aplicar estrategias de interpretación de los mensajes generados en los medios de comunicación para comprender el sentido global de los textos no literarios.', 83, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T2_09', 'Obras literarias a través de su lectura', 'Disfrutar obras literarias a través de su lectura, comentarios y transformación, para ampliar sus competencias lingüísticas, su imaginación, su afectividad y su visión del mundo.', 52, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T2_10', 'Crítica ante la lectura de obras literarias significativas y apropiadas para la edad', 'Mostrar actitud crítica ante la lectura de obras literarias significativas y apropiadas para la edad, como expresión de sentimientos y representaciones de la realidad, para ampliar la visión de mundo.', 53, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T2_11', 'Lectura apreciativa de textos literarios', 'Mostrar sensibilidad ante la lectura apreciativa de textos literarios.', 54, 2);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 5° — Trimestre III (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T3_01', 'Normas básicas de interacción verbal en cualquier situación comunicativa formal', 'Respetar las normas básicas de interacción verbal en cualquier situación comunicativa formal.', 55, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T3_02', 'Lectura de textos literarios según el gusto e interés de cada lector', 'Valorar por la lectura de textos literarios según el gusto e interés de cada lector.', 56, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T3_03', 'Estrategias de búsqueda de información (biblioteca', 'Aplicar estrategias de búsqueda de información (biblioteca, internet, directorio telefónico) en formatos de texto físico y electrónico variados como apoyo al desarrollo de las diferentes tareas escolares.', 84, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T3_04', 'Importancia de las fuentes de comunicación informativa para realizar', 'Valorar importancia de las fuentes de comunicación informativa para realizar, exitosamente diversas actividades.', 57, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T3_05', 'Entretenimiento y diversión al visitar estas fuentes informativas', 'Entretenimiento y diversión al visitar estas fuentes informativas.', 85, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T3_06', 'Estrategias de comprensión lectora', 'Utilizar estrategias de comprensión lectora: resúmenes, síntesis, fichas de lectura, mapas conceptuales, entre otros (antes de la lectura- conocimientos previos, formular hipótesis-, durante la lectura-verificación de hipótesis, preguntas...', 86, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G5_T3_07', 'Estructuras gramaticales y las normas básicas ortográficas para el enriquecimiento léxico', 'Utilizar las estructuras gramaticales y las normas básicas ortográficas para el enriquecimiento léxico y la competencia comunicativa.', 87, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T3_08', 'Búsqueda de información como una actividad entretenida y educativa', 'Disfrutar la búsqueda de información como una actividad entretenida y educativa.', 58, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T3_09', 'Conocimiento que se puede obtener a partir de estas fuentes', 'Valorar conocimiento que se puede obtener a partir de estas fuentes.', 59, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T3_10', 'Crítica frente a la información encontrada en las fuentes consultadas', 'Mostrar actitud crítica frente a la información encontrada en las fuentes consultadas.', 60, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G5_T3_11', 'Comprender la lectura de textos para obtener éxito en las actividades escolares y extraesc', 'Mostrar interés en comprender la lectura de textos para obtener éxito en las actividades escolares y extraescolares y como medio para el desarrollo integral.', 61, 3);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 6° — Trimestre I (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T1_01', 'Influencia de las condiciones de vida escolar', 'Mostrar sensibilidad ante la influencia de las condiciones de vida escolar.', 62, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T1_02', 'Crítica ante los factores y prácticas sociales escolares que favorecen el desarrollo human', 'Mostrar actitud crítica ante los factores y prácticas sociales escolares que favorecen el desarrollo humano y el comportamiento responsable.', 63, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T1_03', 'Técnicas personales de lectura silenciosa y dirigida en el desarrollo del gusto por leer', 'Utilizar técnicas personales de lectura silenciosa y dirigida en el desarrollo del gusto por leer.', 88, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T1_04', 'Hábito de leer como necesidad personal que lleva al disfrute', 'Valorar hábito de leer como necesidad personal que lleva al disfrute.', 64, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T1_05', 'Estrategias de interpretación de obras de arte plástico para el desarrollo de procesos de', 'Aplicar estrategias de interpretación de obras de arte plástico para el desarrollo de procesos de indagación, observación, descripción, reflexión, entre otros.', 89, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T1_06', 'Sentido crítico ante la reflexión constante (pensamiento lógico)', 'Sentido crítico ante la reflexión constante (pensamiento lógico).', 90, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T1_07', 'Diferentes tipos de lenguaje (coloquial o cotidiano', 'Aplicar los diferentes tipos de lenguaje (coloquial o cotidiano, meta, formal y figurado) para el enriquecimiento de las producciones de diversos tipos de texto oral y escrito.', 91, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T1_08', 'Conciencia de su creatividad al asumir de manera responsable el tipo de lenguaje empleado', 'Conciencia de su creatividad al asumir de manera responsable el tipo de lenguaje empleado en las diversas prácticas sociales.', 92, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T1_09', 'Estrategias de interpretación (inferencias', 'Aplicar estrategias de interpretación (inferencias, hipótesis, conjeturas, analogías, conclusiones, proposiciones) para captar el sentido global del texto.', 93, 1),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T1_10', 'Lectura apreciativa de textos literarios', 'Mostrar sensibilidad ante la lectura apreciativa de textos literarios.', 65, 1),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T1_11', 'Diálogo como herramienta que permite superar los conflictos y mostrar en la conducta habit', 'Valorar diálogo como herramienta que permite superar los conflictos y mostrar en la conducta habitual y en el uso del lenguaje, respeto hacia las personas, creencias y opiniones distintas a las propias.', 66, 1);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 6° — Trimestre II (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T2_01', 'Actitudes positivas hacia los otros miembros del grupo', 'Actitudes positivas hacia los otros miembros del grupo: de cooperación, de ayuda, de comprensión de los puntos de vista y de los sentimientos ajenos.', 67, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T2_02', 'Enriquecimiento léxico para el desarrollo de la competencia comunicativa', 'Mostrar interés en el enriquecimiento léxico para el desarrollo de la competencia comunicativa.', 68, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T2_03', 'Estrategias de comprensión de la estructura y el significado de las diferentes partes de l', 'Utilizar estrategias de comprensión de la estructura y el significado de las diferentes partes de los enunciados.', 94, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T2_04', 'Sus textos al escribir con claridad', 'Valorar sus textos al escribir con claridad, precisión y coherencia.', 69, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T2_05', 'Adecuada de los elementos paralingüísticos y lingüísticos', 'Utilizar adecuada de los elementos paralingüísticos y lingüísticos: la voz –intensidad o volumen, ritmo, vocalizaciones- y el lenguaje no verbal (mirada, gesticulación) en las exposiciones de temas escolares para la comprensión del mensaje por...', 95, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T2_06', '(contextualizada y oportuna) del vocabulario básico ortográfico y el vocabulario meta en l', 'Aplicar (contextualizada y oportuna) del vocabulario básico ortográfico y el vocabulario meta en la producción textual oral y escrita de los diversos escritos.', 96, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T2_07', 'Estrategias de reconocimiento de los diversos géneros literarios (poesía', 'Utilizar estrategias de reconocimiento de los diversos géneros literarios (poesía, cuento, novela, drama, leyenda) para la comprensión global de los textos. Identificación del lenguaje figurado presente en: adivinanzas, trabalenguas, bombas,...', 97, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T2_08', 'Gozo por la lectura de textos literarios de diversos géneros', 'Gozo por la lectura de textos literarios de diversos géneros.', 98, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T2_09', 'Estrategias de interpretación (dramatizaciones', 'Aplicar estrategias de interpretación (dramatizaciones, representaciones de roles, lecturas interactivas, discusiones literarias, generar preguntas, la conferencia y el comentario, entre otras) de las obras literarias para el desarrollo del...', 99, 2),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T2_10', 'Mejorar sus escritos al hacer uso de las correctas normas ortográficas y gramaticales que', 'Mostrar interés en mejorar sus escritos al hacer uso de las correctas normas ortográficas y gramaticales que rigen nuestro idioma.', 70, 2),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T2_11', 'Comunicación como un conjunto relacionado entre la expresión oral', 'Valorar comunicación como un conjunto relacionado entre la expresión oral, lectora y escritora que permite expresar ideas, sentimientos, emociones y ampliar su registro del lenguaje, adecuándolo a las diversas situaciones comunicativas.', 71, 2);  -- A

-- ---------------------------------------------------------------------------
-- GRADO 6° — Trimestre III (11 ejes)
-- ---------------------------------------------------------------------------
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T3_01', 'Obras literarias a través de su lectura', 'Disfrutar obras literarias a través de su lectura, comentarios y transformación para ampliar sus competencias lingüísticas, su imaginación, su afectividad y su visión del mundo.', 72, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T3_02', 'Estrategias de análisis (preguntas poderosas', 'Aplicar estrategias de análisis (preguntas poderosas, argumentaciones, falacias, foros, conversaciones, documentales, debates, círculos de estudio, entre otros) de los mensajes generados (escolares y extraescolares) por interlocutores y medios de...', 100, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T3_03', 'Crítica y propositivamente ante los mensajes orales escuchados', 'Reaccionar crítica y propositivamente ante los mensajes orales escuchados, con el propósito de contribuir en la construcción de los significados compartidos.', 73, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T3_04', 'Normas básicas de interacción verbal en cualquier situación comunicativa formal', 'Respetar las normas básicas de interacción verbal en cualquier situación comunicativa formal.', 74, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T3_05', 'Soportes escritos (biblioteca', 'Utilizar soportes escritos (biblioteca, internet, guía telefónica) como ayuda durante el proceso de planificación de la producción textual escrita para generar ideas, compartir con otras personas la generación de conocimientos, aprovechar los...', 101, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T3_06', 'Entretenimiento y diversión al visitar estas fuentes de información', 'Entretenimiento y diversión al visitar estas fuentes de información.', 102, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T3_07', 'Estrategias de comprensión lectora (resúmenes', 'Aplicar estrategias de comprensión lectora (resúmenes, esquemas, síntesis, mapas conceptuales, gráficos, figuras, mapas pictóricos e historietas gráficas, líneas del tiempo, entre otros) en diversos tipos de textos.', 103, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T3_08', 'Oraciones enunciativas', 'Utilizar oraciones enunciativas, afirmativas, negativas, dubitativas, exclamativas, según la intención del emisor en la producción textual oral y escrita de textos narrativos, explicativos, argumentativos e informativos.', 104, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 2, 'ESP_G6_T3_09', 'Estructuras gramaticales y las normas básicas ortográficas para el enriquecimiento léxico', 'Utilizar las estructuras gramaticales y las normas básicas ortográficas para el enriquecimiento léxico y la competencia comunicativa. Tipo de texto Tipo de lenguaje explicativo coloquial expositivo técnico escolar narrativo figurado Tipo de texto...', 105, 3),  -- P
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T3_10', 'Lectura de textos literarios', 'Valorar por la lectura de textos literarios, según el gusto e interés de cada lector (a).', 75, 3),  -- A
((SELECT id FROM materias WHERE clave='ESPANOL'), 3, 'ESP_G6_T3_11', 'Importancia de las fuentes de comunicación informativa para realizar diversas actividades', 'Valorar importancia de las fuentes de comunicación informativa para realizar diversas actividades con éxito.', 76, 3);  -- A

-- ============================================================================
-- 3) Vincular cada eje a su grado correspondiente (ejes_tematicos_niveles)
--    Cada eje de Español aplica a UN solo grado (el de su clave ESP_G{n}_*).
-- ============================================================================

-- Grado 1° → todos los ejes con clave ESP_G1_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'ESP_G1_%'
  AND n.numero_grado = 1
ON CONFLICT DO NOTHING;

-- Grado 2° → todos los ejes con clave ESP_G2_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'ESP_G2_%'
  AND n.numero_grado = 2
ON CONFLICT DO NOTHING;

-- Grado 3° → todos los ejes con clave ESP_G3_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'ESP_G3_%'
  AND n.numero_grado = 3
ON CONFLICT DO NOTHING;

-- Grado 4° → todos los ejes con clave ESP_G4_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'ESP_G4_%'
  AND n.numero_grado = 4
ON CONFLICT DO NOTHING;

-- Grado 5° → todos los ejes con clave ESP_G5_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'ESP_G5_%'
  AND n.numero_grado = 5
ON CONFLICT DO NOTHING;

-- Grado 6° → todos los ejes con clave ESP_G6_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'ESP_G6_%'
  AND n.numero_grado = 6
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4) Verificación final (queda como comentario informativo)
-- ============================================================================
--   SELECT COUNT(*) FROM ejes_tematicos
--   WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESPANOL');
--   -- Debe devolver 198
--
--   SELECT periodo_numero, tipo_saber_id, COUNT(*)
--   FROM ejes_tematicos
--   WHERE materia_id = (SELECT id FROM materias WHERE clave = 'ESPANOL')
--   GROUP BY periodo_numero, tipo_saber_id
--   ORDER BY periodo_numero, tipo_saber_id;
