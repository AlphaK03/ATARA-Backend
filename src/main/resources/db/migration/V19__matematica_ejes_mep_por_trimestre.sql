-- =============================================================================
-- V19: Ejes temáticos de MATEMÁTICA alineados al currículo MEP CR (orden PDF)
--
-- Cambio principal:
--   Hasta V12/V13, Matemática tenía 21 ejes genéricos (MC_NUMEROS, MP_GEOMETRIA;
--   MA_FRACCIONES, etc.) que aplicaban a los grados de I/II ciclo sin distinción
--   de trimestre. Esto no reflejaba la progresión secuencial del Programa de
--   Estudio MEP "Matemáticas I y II Ciclo", donde cada año tiene habilidades
--   específicas distribuidas a lo largo de los 3 trimestres del año lectivo.
--
-- Solución (mismo patrón aplicado en V17 para Ciencias):
--   1. NO se vuelve a agregar la columna `periodo_numero`, ya creada en V17.
--   2. Se ELIMINAN los 21 ejes genéricos previos de Matemática (MC_*, MP_*, MA_*).
--   3. Se INSERTAN 198 ejes nuevos para Matemática, distribuidos así:
--        6 grados (1°-6°) × 3 trimestres × 11 ejes = 198
--      Cada eje proviene de una habilidad específica del Programa MEP de
--      "Matemáticas I y II Ciclo" en su orden de aparición en el PDF.
--      Las 5 áreas matemáticas se mantienen balanceadas dentro de cada grado:
--      Números, Geometría, Medidas, Relaciones y Álgebra, Estadística y Probabilidad.
--   4. Se vincula cada eje a su grado correspondiente vía ejes_tematicos_niveles.
--   5. NO se vuelve a recrear la vista vw_ejes_por_materia_nivel, ya actualizada en V17.
--
-- Clasificación tipo_saber (basada en verbo de inicio):
--   - Conceptual (saber qué)    : Identificar, Reconocer, Comprender, Distinguir;
--                                 Describir, Explicar, Clasificar, Determinar, ...
--   - Procedimental (saber hacer): Aplicar, Construir, Calcular, Resolver, Plantear;
--                                 Realizar, Medir, Representar, Trazar, Estimar;
--                                 Operar, Efectuar, Establecer, Ordenar, ...
--   - Actitudinal (saber ser)  : Valorar, Apreciar, Tomar conciencia, Justificar, ...
--
-- Convención de clave: MAT_G{grado}_T{trimestre}_{pos:02d}
--   Ejemplo: MAT_G3_T2_05 = Matemática, 3° grado, Trimestre II, posición 5
--
-- Filtrado esperado en el wizard de evaluación:
--   SELECT * FROM ejes_tematicos e
--   JOIN ejes_tematicos_niveles en ON en.eje_tematico_id = e.id
--   WHERE e.materia_id = (SELECT id FROM materias WHERE clave='MATEMATICAS')
--     AND en.nivel_id = :grade_nivel_id
--     AND (e.periodo_numero = :trimestre OR e.periodo_numero IS NULL)
--   ORDER BY e.tipo_saber_id, e.orden;
-- =============================================================================

-- ============================================================================
-- 1) Limpiar ejes anteriores de MATEMÁTICA (MC_*, MP_*, MA_*)
--    El cascade no aplica aquí porque algunas FKs no tienen ON DELETE CASCADE;
--    así que limpiamos en orden inverso de dependencias.
-- ============================================================================

-- 1a) Borrar detalles de evaluación que referencian ejes de Matemática
DELETE FROM detalle_evaluacion_saber
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'MATEMATICAS')
);

-- 1b) Borrar alertas temáticas de Matemática
DELETE FROM alertas_tematicas
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'MATEMATICAS')
);

-- 1c) Borrar relaciones eje ↔ nivel para Matemática
DELETE FROM ejes_tematicos_niveles
WHERE eje_tematico_id IN (
    SELECT id FROM ejes_tematicos
    WHERE materia_id = (SELECT id FROM materias WHERE clave = 'MATEMATICAS')
);

-- 1d) Borrar los 21 ejes genéricos antiguos (MC_*, MP_*, MA_*)
DELETE FROM ejes_tematicos
WHERE materia_id = (SELECT id FROM materias WHERE clave = 'MATEMATICAS');

-- ============================================================================
-- 2) Insertar 198 ejes nuevos para MATEMÁTICA (orden MEP)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- GRADO 1° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 1° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T1_01', 'Varias utilidades de los números en diferentes contextos', 'Identificar varias utilidades de los números en diferentes contextos cotidianos.', 1, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T1_02', 'Conteo para asociar conjuntos de objetos con su', 'Utilizar el conteo para asociar conjuntos de objetos con su respectiva cardinalidad.', 1, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T1_03', 'Aportar ejemplos de representaciones distintas de un número', 'Identificar y aportar ejemplos de representaciones distintas de un número.', 2, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T1_04', 'Correspondencias entre las diferentes formas de representación de', 'Establecer correspondencias entre las diferentes formas de representación de un número natural menor que 100 aplicando los conceptos de unidad y decena.', 2, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T1_05', 'Posición de orden en objetos y personas utilizando', 'Describir la posición de orden en objetos y personas utilizando los números ordinales hasta el décimo.', 3, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T1_06', 'Suma de números naturales como combinación y agregación', 'Identificar la suma de números naturales como combinación y agregación de elementos u objetos.', 4, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T1_07', 'Relación de las operaciones suma y resta', 'Establecer la relación de las operaciones suma y resta.', 3, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T1_08', 'Doble de un número menor', 'Identificar el doble de un número menor.', 5, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T1_09', 'Problemas y ope  raciones con sumas y', 'Resolver problemas y ope  raciones con sumas y restas de números naturales cuyos resultados sean menores que 100.', 4, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T1_10', 'Correctamente los  símbolos =, + y –', 'Utilizar correctamente los  símbolos =, + y –.', 5, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T1_11', 'Números menores que 100 mediante composición y ', 'Representar números menores que 100 mediante composición y  descomposición aditiva.', 6, 1);  -- P

-- 1° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T2_01', 'Mentalmente  sumas o restas mediante diversas estrategias', 'Calcular mentalmente  sumas o restas mediante diversas estrategias.', 7, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T2_02', 'Trazar líneas rectas, curvas, quebradas y mixtas', 'Identificar y trazar líneas rectas, curvas, quebradas y mixtas.', 6, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T2_03', 'Interior, el exterior y el borde referidos a', 'Distinguir el interior, el exterior y el borde referidos a líneas cerradas tanto en el entorno como en dibujos y trazos elaborados por sí mismo y por otros.', 7, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T2_04', 'Figuras planas en cuerpos sólidos', 'Identificar figuras planas en cuerpos sólidos.', 8, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T2_05', 'Figuras planas de acuerdo con su forma (triángulos', 'Clasificar figuras planas de acuerdo con su forma (triángulos, cuadriláteros, polígonos).', 9, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T2_06', 'Objetos que tengan forma de caja', 'Identificar objetos que tengan forma de caja.', 10, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T2_07', 'Medidas utilizando unidades de medidas arbitrarias como la', 'Estimar medidas utilizando unidades de medidas arbitrarias como la cuarta o unidades definidas por las y los estudiantes.', 8, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T2_08', 'Medidas utilizando el metro o el centímetro como', 'Estimar medidas utilizando el metro o el centímetro como unidades de medida convencionales.', 9, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T2_09', 'Colón como la unidad monetaria de Costa Rica', 'Reconocer el colón como la unidad monetaria de Costa Rica.', 11, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T2_10', 'Relación entre las monedas de denominaciones hasta ₡100', 'Identificar la relación entre las monedas de denominaciones hasta ₡100.', 12, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T2_11', 'Pesos de diversos objetos en forma intuitiva', 'Comparar los pesos de diversos objetos en forma intuitiva.', 10, 2);  -- P

-- 1° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T3_01', 'Necesidad de medir el tiempo', 'Identificar la necesidad de medir el tiempo.', 13, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T3_02', 'Intervalo de tiempo transcurrido entre dos eventos', 'Estimar el intervalo de tiempo transcurrido entre dos eventos.', 11, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T3_03', 'Capacidad de diversos recipientes utilizando unidades de capacidad', 'Estimar la capacidad de diversos recipientes utilizando unidades de capacidad arbitrarias.', 12, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T3_04', 'Patrones o regularidades en sucesiones con números menores', 'Identificar patrones o regularidades en sucesiones con números menores que 100, con figuras o con representaciones geométricas.', 14, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T3_05', 'Sucesiones con figuras o con números naturales menores', 'Construir sucesiones con figuras o con números naturales menores que 100 que obedecen a una ley dada de formación o patrón.', 13, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T3_06', 'Significado de “ = ”', 'Reconocer el significado de “ = ”.', 15, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T3_07', 'Cantidades en situaciones diversas utilizando la escritura de', 'Representar cantidades en situaciones diversas utilizando la escritura de expresiones matemáticas.', 14, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T3_08', 'Datos dentro del contexto estudiantil (aula, escuela, hogar', 'Identificar datos dentro del contexto estudiantil (aula, escuela, hogar, comunidad, etc.).', 16, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G1_T3_09', 'Datos en cuantitativos o cualitativos', 'Clasificar datos en cuantitativos o cualitativos.', 17, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T3_10', 'Datos mediante la observación y la interrogación', 'Recolectar datos mediante la observación y la interrogación.', 15, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G1_T3_11', 'Frecuencia de los datos repetidos para agruparlos. No', 'Emplear la frecuencia de los datos repetidos para agruparlos. No. de hermanos Habilidades específicas.', 16, 3);  -- P

-- ---------------------------------------------------------------------------
-- GRADO 2° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 2° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T1_01', 'Conteo en la elaboración de agrupamientos de 1', 'Utilizar el conteo en la elaboración de agrupamientos de 1 en 1, 2 en 2, 3 en 3, 4 en 4, 5 en 5, de 10 en 10, 50 en 50 y de 100 en 100 elementos.', 17, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T1_02', 'Números menores que 1000 aplicando los conceptos de', 'Representar números menores que 1000 aplicando los conceptos de centena, decena, unidades y sus relaciones.', 18, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T1_03', 'Resolver problemas y operaciones con sumas y restas', '14. Resolver problemas y operaciones con sumas y restas de números naturales menores.', 19, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T1_04', 'Números en  la recta numérica', 'Representar números en  la recta numérica.', 20, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T1_05', 'Doble de un  número natural y la', 'Determinar el doble de un  número natural y la mitad de números pares menores que 100.', 18, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T1_06', 'Relación entre las  operaciones suma y resta', 'Aplicar la relación entre las  operaciones suma y resta para la verificación de respuestas o resultados.', 21, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T1_07', 'Multiplicación  como la adición repetida de grupos', 'Identificar la multiplicación  como la adición repetida de grupos de igual tamaño.', 19, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T1_08', 'Problemas y operaciones con sumas y restas de', 'Resolver problemas y operaciones con sumas y restas de números naturales menores que 1000.', 22, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T1_09', '2 números dos pares menores que 100', 'Dividir por 2 números dos pares menores que 100.', 23, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T1_10', 'Sumas, restas y  multiplicaciones utilizando diversas estrategias', 'Calcular sumas, restas y  multiplicaciones utilizando diversas estrategias de cálculo mental y estimación.', 24, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T1_11', 'Dibujos y en el entorno posiciones de líneas', 'Identificar en dibujos y en el entorno posiciones de líneas rectas: horizontal, vertical, oblicua.', 20, 1);  -- C

-- 2° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T2_01', 'Líneas rectas en posiciones horizontal, vertical y oblicua', 'Trazar líneas rectas en posiciones horizontal, vertical y oblicua.', 25, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T2_02', 'Triángulos y cuadriláteros utilizando intrumentos geométricos', 'Trazar triángulos y cuadriláteros utilizando intrumentos geométricos.', 26, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T2_03', 'Si un rectángulo un cuadrado', 'Reconocer si un rectángulo un cuadrado.', 21, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T2_04', 'Semejanzas y diferencias en triángulos, cuadrados, rectángulos y', 'Identificar semejanzas y diferencias en triángulos, cuadrados, rectángulos y cuadriláteros en general.', 22, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T2_05', 'Objetos que tengan forma de caja o forma', 'Identificar objetos que tengan forma de caja o forma esférica.', 23, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T2_06', 'Longitudes sin usar la regla', 'Comparar longitudes sin usar la regla.', 27, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T2_07', 'Mediciones utilizando el metro y el centímetro', 'Realizar mediciones utilizando el metro y el centímetro.', 28, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T2_08', 'Símbolos para metro y centímetro', 'Reconocer los símbolos para metro y centímetro.', 24, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T2_09', 'Cantidades monetarias', 'Comparar cantidades monetarias.', 29, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T2_10', 'Símbolo para kilogramos', 'Reconocer el símbolo para kilogramos.', 25, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T2_11', 'Medidas de peso', 'Comparar medidas de peso.', 30, 2);  -- P

-- 2° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T3_01', 'Intervalos de tiempo medidos en minutos', 'Comparar intervalos de tiempo medidos en minutos.', 31, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T3_02', 'Capacidad de diversos recipientes utilizando el litro como', 'Estimar la capacidad de diversos recipientes utilizando el litro como unidad de capacidad.', 32, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T3_03', 'Resolver problemas que involucren diferentes medidas', 'Plantear y resolver problemas que involucren diferentes medidas.', 33, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T3_04', 'Construir sucesiones con figuras, representaciones geométricas o con', 'Identificar y construir sucesiones con figuras, representaciones geométricas o con números naturales menores a 100 000 que obedecen a un patrón dado de formación.', 26, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T3_05', 'Números ascen dente o descendentemen te', 'Ordenar números ascen dente o descendentemen te.', 34, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T3_06', 'Datos cuantitativos y cualitativos en diferentes contextos', 'Identificar datos cuantitativos y cualitativos en diferentes contextos.', 27, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T3_07', 'Información que ha sido resumida en dibujos, diagramas', 'Interpretar información que ha sido resumida en dibujos, diagramas, cuadros y gráficos.', 28, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T3_08', 'Datos mediante la observación y la interrogación', 'Recolectar datos mediante la observación y la interrogación.', 35, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T3_09', 'Datos por medio de cuadros que incluyan frecuencias', 'Resumir los datos por medio de cuadros que incluyan frecuencias absolutas.', 36, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G2_T3_10', 'Análisis estadísticos para comunicar y argumentar respuestas a', 'Utilizar los análisis estadísticos para comunicar y argumentar respuestas a interrogantes que surgen de los problemas planteados. Nombre de cada estudiante Abarca Lewis Manolín Álvarez Moín Libertad Habilidades específicas.', 37, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G2_T3_11', 'Resultados seguros, probables o imposibles según corresponda a', 'Identificar resultados seguros, probables o imposibles según corresponda a una situación particular.', 29, 3);  -- C

-- ---------------------------------------------------------------------------
-- GRADO 3° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 3° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T1_01', 'Números menores que 100 000 aplicando los conceptos', 'Representar números menores que 100 000 aplicando los conceptos de decena de millar y unidad de millar.', 38, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T1_02', 'Sucesiones de  números de 10 en 10', 'Escribir sucesiones de  números de 10 en 10, de 100 en 100 o de 1000 en 1000.', 39, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T1_03', 'Números  ordinales hasta el centésimo como la', 'Identificar los números  ordinales hasta el centésimo como la unión de vocablos asociados.', 30, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T1_04', 'Multiplicaciones en columna donde el segundo factor sea', 'Efectuar multiplicaciones en columna donde el segundo factor sea de uno o dos dígitos agrupando y sin agrupar y donde el resultado sea un número menor que 100 000.', 40, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T1_05', 'División como  reparto equitativo o como cas', 'Identificar la división como  reparto equitativo o como cas agrupamiento.', 31, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T1_06', 'Triple o el  quíntuple de números menores', 'Determinar el triple o el  quíntuple de números menores que 100.', 32, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T1_07', 'Pertinencia de los resultados que se ob tienen', 'Evaluar la pertinencia de los resultados que se ob tienen al realizar un cálculo o una estimación.', 41, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T1_08', 'Ángulos en dibujos y objetos del entorno', 'Reconocer ángulos en dibujos y objetos del entorno.', 33, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T1_09', 'Medida de ángulos en objetos del entorno', 'Estimar la medida de ángulos en objetos del entorno.', 42, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T1_10', 'Observación (en dibujos y objetos del entorno) si', 'Estimar por observación (en dibujos y objetos del entorno) si un ángulo recto, agudo u obtuso.', 43, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T1_11', 'Resolver problemas que involucren los conceptos de lado', 'Plantear y resolver problemas que involucren los conceptos de lado, vértice, ángulo recto, ángulo obtuso, ángulo agudo.', 44, 1);  -- P

-- 3° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T2_01', 'Rectas y segmentos paralelos en dibujos y objetos', 'Reconocer rectas y segmentos paralelos en dibujos y objetos del entorno.', 34, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T2_02', 'Segmentos paralelos y perpendiculares', 'Trazar segmentos paralelos y perpendiculares.', 45, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T2_03', 'Polígonos según el número de sus lados (triángulo', 'Clasificar polígonos según el número de sus lados (triángulo, cuadrilátero, pentágono, hexágono).', 35, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T2_04', 'Trazar circunferencias', 'Identificar y trazar circunferencias.', 36, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T2_05', 'Radio y diámetro de esferas', 'Reconocer el radio y diámetro de esferas.', 37, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T2_06', 'Elementos de cajas y cubos (caras y aristas)', 'Reconocer los elementos de cajas y cubos (caras y aristas).', 38, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T2_07', 'Mediciones', 'Estimar mediciones.', 46, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T2_08', 'Conversiones de medida entre el metro, sus múltiplos', 'Realizar conversiones de medida entre el metro, sus múltiplos y submúltiplos.', 47, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T2_09', 'Comparar cantidades monetarias', 'Estimar y comparar cantidades monetarias.', 48, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T2_10', 'Pesos utilizando el kilogramo y sus divisiones en', 'Estimar pesos utilizando el kilogramo y sus divisiones en ¼, ½ y ¾ de kg.', 49, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T2_11', 'Tiempo', 'Estimar el tiempo.', 50, 2);  -- P

-- 3° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T3_01', 'Conversiones entre estas medidas', 'Realizar conversiones entre estas medidas.', 51, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T3_02', 'Conversiones entre el litro, sus múltiplos y submúltiplos', 'Realizar conversiones entre el litro, sus múltiplos y submúltiplos.', 52, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T3_03', 'Construir sucesiones con figuras, representaciones geométricas o con', 'Identificar y construir sucesiones con figuras, representaciones geométricas o con números naturales menores a 100 000 que obedecen a un patrón dado de formación.', 39, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T3_04', 'Resolver problemas aplicando sucesiones y patrones', 'Plantear y resolver problemas aplicando sucesiones y patrones.', 53, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T3_05', 'Número que falta en una tabla', 'Identificar el número que falta en una tabla.', 40, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T3_06', 'Sumas y restas en la recta numérica', 'Representar sumas y restas en la recta numérica.', 54, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G3_T3_07', 'Datos cuantitativos y cualitativos en diferentes contextos', 'Identificar datos cuantitativos y cualitativos en diferentes contextos.', 41, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T3_08', 'Problemas del contexto estudiantil que puedan abordarse por', 'Plantear problemas del contexto estudiantil que puedan abordarse por medio de recolección y análisis de datos.', 55, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T3_09', 'Datos por medio de cuadros que incluyan frecuencias', 'Resumir los datos por medio de cuadros que incluyan frecuencias absolutas o gráficos de barras.', 56, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T3_10', 'Análisis estadísticos para comunicar en forma verbal y', 'Utilizar los análisis estadísticos para comunicar en forma verbal y escrita los argumentos que dan respuestas a los problemas contextuales. Habilidades específicas.', 57, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G3_T3_11', 'Posibles resultados de un experimento o situación aleatoria', 'Representar los posibles resultados de un experimento o situación aleatoria simple por enumeración o mediante diagramas.', 58, 3);  -- P

-- ---------------------------------------------------------------------------
-- GRADO 4° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 4° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T1_01', 'Escribir números naturales menores que un millón', 'Leer y escribir números naturales menores que un millón.', 42, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T1_02', 'Números pares e impares', 'Reconocer números pares e impares.', 43, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T1_03', 'Problemas utilizando el algoritmo de la división de', 'Resolver problemas utilizando el algoritmo de la división de números naturales.', 59, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T1_04', 'Fracciones como parte de la unidad o parte', 'Identificar las fracciones como parte de la unidad o parte de una colección de objetos.', 44, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T1_05', 'Resolver problemas que involucren fracciones propias', 'Plantear y resolver problemas que involucren fracciones propias.', 60, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T1_06', 'Cuáles números naturales consecutivos se encuentra un número', 'Establecer entre cuáles números naturales consecutivos se encuentra un número decimal al localizarlo en la recta numérica.', 61, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T1_07', 'Plantear problemas donde se requiera el uso de', 'Resolver y plantear problemas donde se requiera el uso de la suma, la resta, la multiplicación y la división de números naturales.', 62, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T1_08', 'Métodos y las herramientas más adecuados para la', 'Seleccionar los métodos y las herramientas más adecuados para la resolución de cálculos.', 63, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T1_09', 'Diversos elementos de los triángulos (lado, vértice, ángulo', 'Identificar diversos elementos de los triángulos (lado, vértice, ángulo, base, altura).', 45, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T1_10', 'Triángulos de acuerdo con las medidas de sus', 'Clasificar triángulos de acuerdo con las medidas de sus lados.', 46, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T1_11', 'Observación, si un triángulo equilátero, isósceles o escaleno', 'Estimar, por observación, si un triángulo equilátero, isósceles o escaleno.', 64, 1);  -- P

-- 4° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T2_01', 'Diversos elementos de los cuadriláteros (lado, vértice, ángulo', 'Identificar diversos elementos de los cuadriláteros (lado, vértice, ángulo, base, altura, diagonal).', 47, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T2_02', 'Cuadriláteros que cumplan características dadas', 'Trazar cuadriláteros que cumplan características dadas.', 65, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T2_03', 'Cuadriláteros no paralelogramos en trapecios y trapezoides', 'Clasificar los cuadriláteros no paralelogramos en trapecios y trapezoides.', 48, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T2_04', 'Problemas que involucren el trazado de diversos tipos', 'Resolver problemas que involucren el trazado de diversos tipos de cuadrilátero.', 66, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T2_05', 'Dibujos u objetos del entorno polígonos regulares e', 'Reconocer en dibujos u objetos del entorno polígonos regulares e irregulares.', 49, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T2_06', 'Planos en conexión con las caras de los', 'Identificar planos en conexión con las caras de los prismas rectangulares.', 50, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T2_07', 'Diversos cuadriláteros en conexión con cubos y prismas', 'Identificar diversos cuadriláteros en conexión con cubos y prismas en general.', 51, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T2_08', 'Punto homólogo a otro respecto a una recta', 'Ubicar un punto homólogo a otro respecto a una recta.', 67, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T2_09', 'Áreas utilizando el metro cuadrado, sus múltiplos y', 'Estimar áreas utilizando el metro cuadrado, sus múltiplos y submúltiplos.', 68, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T2_10', 'Relación bancaria entre las monedas y billetes de', 'Establecer la relación bancaria entre las monedas y billetes de todas las denominaciones.', 69, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T2_11', 'Temperaturas en las escalas Celsius y Fahrenheit utilizando', 'Medir temperaturas en las escalas Celsius y Fahrenheit utilizando instrumentos apropiados.', 70, 2);  -- P

-- 4° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T3_01', 'Medición de temperatura a situaciones reales o ficticias', 'Aplicar la medición de temperatura a situaciones reales o ficticias.', 71, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T3_02', 'Conversiones entre estas medidas', 'Realizar conversiones entre estas medidas.', 72, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T3_03', 'Conversiones entre diversas unidades de medida', 'Realizar conversiones entre diversas unidades de medida.', 73, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T3_04', 'Ángulos a simple vista, usando un modelo', 'Comparar ángulos a simple vista, usando un modelo.', 74, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T3_05', 'Patrones en sucesiones con figuras, representaciones geométricas y', 'Analizar patrones en sucesiones con figuras, representaciones geométricas y en tablas de números naturales menores que 1 000.', 75, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T3_06', 'Resolver problemas formulados verbalmente', 'Plantear y resolver problemas formulados verbalmente.', 76, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T3_07', 'Información que ha sido resumida en dibujos, diagramas', 'Interpretar información que ha sido resumida en dibujos, diagramas, cuadros y gráficos en diferentes contextos.', 52, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T3_08', 'Posibles errores en los datos recolectados', 'Identificar posibles errores en los datos recolectados.', 53, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G4_T3_09', 'Diagramas de puntos para representar grupos de datos', 'Emplear los diagramas de puntos para representar grupos de datos cuantitativos.', 77, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T3_10', 'Situaciones aleatorias en diferentes situaciones del contexto', 'Reconocer situaciones aleatorias en diferentes situaciones del contexto.', 54, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G4_T3_11', 'Resultados a favor de la ocurrencia de un', 'Identificar los resultados a favor de la ocurrencia de un evento.', 55, 3);  -- C

-- ---------------------------------------------------------------------------
-- GRADO 5° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 5° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T1_01', 'Reconocer y escribir los números naturales', 'Contar, reconocer y escribir los números naturales.', 78, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T1_02', 'Problemas y operaciones donde se requiera el uso', 'Resolver problemas y operaciones donde se requiera el uso de la combinación de operaciones suma, resta, multiplicación y división de números naturales.', 79, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T1_03', 'Conceptos de múltiplo de un número natural, números', 'Aplicar los conceptos de múltiplo de un número natural, números pares e impares en la resolución de problemas.', 80, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T1_04', 'Divisores de un número natural', 'Identificar divisores de un número natural.', 56, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T1_05', 'Fracciones impropias', 'Identificar fracciones impropias.', 57, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T1_06', 'Fracción impropia en notación mixta y viceversa. Los', 'Expresar una fracción impropia en notación mixta y viceversa. Los Ángeles 40.', 81, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T1_07', 'Fracciones  homogéneas y heterogé neas', 'Identificar fracciones  homogéneas y heterogé neas.', 58, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T1_08', 'Fracciones en la recta numérica', 'Ubicar fracciones en la recta numérica.', 82, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T1_09', 'Fracciones  entre dos números naturales consecutivos', 'Determinar fracciones  entre dos números naturales consecutivos.', 59, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T1_10', 'Correspon dencia entre fracción de cimal y número', 'Establecer la correspon dencia entre fracción de cimal y número decimal.', 83, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T1_11', 'Número  decimal en su notación desarrollada', 'Representar un número  decimal en su notación desarrollada.', 84, 1);  -- P

-- 5° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_01', 'Número  decimal', 'Redondear un número  decimal.', 85, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_02', 'Plantear pro  blemas donde se requiera el', 'Resolver y plantear pro  blemas donde se requiera el uso de la suma, la resta, la multiplicación y división de números naturales y con decimales.', 86, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_03', 'Perímetros y áreas de figuras en conexión con', 'Estimar perímetros y áreas de figuras en conexión con objetos del entorno.', 87, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_04', 'Utilizando fórmulas, el perímetro y el área de', 'Calcular, utilizando fórmulas, el perímetro y el área de triángulos, cuadrados, rectángulos, paralelogramos y trapecios.', 88, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_05', 'Perímetros y áreas de figuras planas compuestas por', 'Calcular perímetros y áreas de figuras planas compuestas por triángulos, cuadrados, rectángulos, paralelogramos y trapecios.', 89, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_06', 'Problemas que involucren el cálculo de perímetros y', 'Resolver problemas que involucren el cálculo de perímetros y áreas de triángulos y cuadriláteros.', 90, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_07', 'Puntos y figuras utilizando coordenadas en el primer', 'Representar puntos y figuras utilizando coordenadas en el primer cuadrante.', 91, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_08', 'Uso del sistema monetario nacional en situaciones ficticias', 'Aplicar el uso del sistema monetario nacional en situaciones ficticias o del entorno.', 92, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_09', 'Diversas medidas en la resolución de problemas que', 'Aplicar las diversas medidas en la resolución de problemas que se presenten en situaciones ficticias y del entorno.', 93, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_10', 'Esas relaciones en situaciones ficticias o del entorno', 'Aplicar esas relaciones en situaciones ficticias o del entorno.', 94, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T2_11', 'Estimaciones de diversas medidas', 'Realizar estimaciones de diversas medidas.', 95, 2);  -- P

-- 5° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T3_01', 'Cantida ▲ des variables y constan tes', 'Distinguir entre cantida ▲ des variables y constan tes.', 60, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T3_02', 'Aplicar  relaciones entre dos cantidades variables en', 'Identificar y aplicar  relaciones entre dos cantidades variables en una expresión matemá tica.', 61, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T3_03', 'Gráficas de figuras con escala', 'Analizar gráficas de figuras con escala.', 96, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T3_04', 'Relaciones  de dependencia entre cantidades', 'Determinar relaciones  de dependencia entre cantidades.', 62, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 3, 'MAT_G5_T3_05', 'Importancia de la estadística en la historia', 'Valorar la importancia de la estadística en la historia.', 1, 3),  -- A
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T3_06', 'Conceptos de población y muestra', 'Identificar los conceptos de población y muestra.', 63, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T3_07', 'Importancia del cuestionario en los procesos de selección', 'Reconocer la importancia del cuestionario en los procesos de selección de información.', 64, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T3_08', 'Fuentes potenciales de errores en la recopilación de', 'Identificar fuentes potenciales de errores en la recopilación de datos por medio del cuestionario.', 65, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T3_09', 'Datos por medio de la aplicación de un', 'Recolectar datos por medio de la aplicación de un cuestionario y resumir la información correspondiente en una base de datos codificada.', 97, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G5_T3_10', 'Información recolectada por medio de un cuestionario mediante', 'Analizar la información recolectada por medio de un cuestionario mediante la elaboración de cuadros, gráficos con frecuencias absolutas y el cálculo de medidas de posición y de variabilidad. Mucho Habilidades específicas.', 98, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G5_T3_11', 'Eventos seguros, probables o imposibles en situaciones aleatorias', 'Determinar eventos seguros, probables o imposibles en situaciones aleatorias particulares.', 66, 3);  -- C

-- ---------------------------------------------------------------------------
-- GRADO 6° (33 ejes: 11 por trimestre)
-- ---------------------------------------------------------------------------

-- 6° — Trimestre I
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T1_01', 'Conceptos de divisibilidad, divisor, factor y múltiplo de', 'Aplicar los conceptos de divisibilidad, divisor, factor y múltiplo de un número natural en la resolución de problemas.', 99, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T1_02', 'Números primos y compuestos', 'Identificar números primos y compuestos.', 67, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T1_03', 'Potencias cuya base y exponente sean números naturales', 'Calcular potencias cuya base y exponente sean números naturales no iguales a cero simultáneamente.', 100, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T1_04', 'Múltiplos de 10  como potencias de base', 'Expresar múltiplos de 10  como potencias de base 10.', 101, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T1_05', 'Fracciones  equivalentes', 'Identificar fracciones  equivalentes.', 68, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T1_06', 'Dividir fraccio  nes', 'Multiplicar y dividir fraccio  nes.', 102, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T1_07', 'Inverso  multiplicativo de un número natural y/o', 'Identificar el inverso  multiplicativo de un número natural y/o fraccionario.', 69, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T1_08', 'Problemas donde  se requiera el uso de', 'Resolver problemas donde  se requiera el uso de la combinación de operacio nes suma, resta, multiplicación y división de números naturales y con decimales.', 103, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T1_09', 'Mentalmente  potencias mediante dife rentes estrategias', 'Calcular mentalmente  potencias mediante dife rentes estrategias.', 104, 1),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T1_10', 'Resultado de  operaciones con fracciones mediante el', 'Determinar el resultado de  operaciones con fracciones mediante el cálculo mental utilizando diferentes estra tegias.', 70, 1),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T1_11', 'Problemas que involucren el cálculo de perímetros y', 'Resolver problemas que involucren el cálculo de perímetros y áreas de diversas figuras.', 105, 1);  -- P

-- 6° — Trimestre II
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T2_01', 'Circunferencias en dibujos y objetos del entorno', 'Identificar circunferencias en dibujos y objetos del entorno.', 71, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T2_02', 'Medida de la circunferencia conociendo su diámetro', 'Estimar la medida de la circunferencia conociendo su diámetro.', 106, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T2_03', 'Número  para calcular la medida de circunferencias', 'Utilizar el número  para calcular la medida de circunferencias.', 107, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T2_04', 'Área de círculos', 'Calcular el área de círculos.', 108, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T2_05', 'Diversos elementos en un polígono regular', 'Identificar diversos elementos en un polígono regular.', 72, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T2_06', 'Elementos de un polígono inscrito en una circunferencia', 'Identificar elementos de un polígono inscrito en una circunferencia (ángulos centrales, radio, apotema).', 73, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T2_07', 'Perímetro de polígonos regulares', 'Calcular el perímetro de polígonos regulares.', 109, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T2_08', 'Cuerpos sólidos por su forma', 'Clasificar cuerpos sólidos por su forma.', 74, 2),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T2_09', 'Metro cúbico, sus múltiplos y submúltiplos en diversas', 'Utilizar el metro cúbico, sus múltiplos y submúltiplos en diversas situaciones ficticias o del entorno.', 110, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T2_10', 'Conversiones de unidades cúbicas', 'Realizar conversiones de unidades cúbicas.', 111, 2),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T2_11', 'Esas relaciones en situaciones ficticias o del entorno', 'Aplicar esas relaciones en situaciones ficticias o del entorno.', 112, 2);  -- P

-- 6° — Trimestre III
INSERT INTO ejes_tematicos (materia_id, tipo_saber_id, clave, nombre, descripcion, orden, periodo_numero) VALUES
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_01', 'Diversas medidas en la resolución de problemas dados', 'Aplicar las diversas medidas en la resolución de problemas dados en situaciones ficticias o del entorno.', 113, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_02', 'Conversiones monetarias: colones a dólares, colones a euros', 'Realizar conversiones monetarias: colones a dólares, colones a euros y viceversa.', 114, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_03', 'Proporción  entre cantidades numéri cas', 'Analizar la proporción  entre cantidades numéri cas.', 115, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_04', 'Resolver pro blemas aplicando porcentajes y regla de', 'Plantear y resolver pro blemas aplicando porcentajes y regla de tres.', 116, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_05', 'Sucesiones y  patrones con números, de figuras', 'Analizar sucesiones y  patrones con números, de figuras y representaciones geométricas.', 117, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_06', 'Algebraica  mente una expresión ma temática dada', 'Representar algebraica  mente una expresión ma temática dada verbalmen te.', 118, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T3_07', 'Si un número solución de una ecuación dada', 'Identificar si un número solución de una ecuación dada.', 75, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_08', 'Clasificar grupos de datos utilizando la frecuencia porcentual', 'Resumir y clasificar grupos de datos utilizando la frecuencia porcentual.', 119, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 1, 'MAT_G6_T3_09', 'Frecuencia porcentual como herramienta fundamental para los análisis', 'Identificar la frecuencia porcentual como herramienta fundamental para los análisis comparativos entre dos o más grupos de datos.', 76, 3),  -- C
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_10', 'Resolver problemas vinculados con diferentes contextos utilizando análisis', 'Plantear y resolver problemas vinculados con diferentes contextos utilizando análisis estadísticos. Habilidades específicas.', 120, 3),  -- P
((SELECT id FROM materias WHERE clave='MATEMATICAS'), 2, 'MAT_G6_T3_11', 'Mediante situaciones concretas los valores que puede tomar', 'Deducir mediante situaciones concretas los valores que puede tomar la probabilidad de un evento cualquiera, de un evento seguro y de un evento imposible.', 121, 3);  -- P


-- ============================================================================
-- 3) Vincular cada eje a su grado correspondiente (ejes_tematicos_niveles)
--    Cada eje de Matemática aplica a UN solo grado (el de su clave MAT_G{n}_*).
-- ============================================================================

-- Grado 1° → todos los ejes con clave MAT_G1_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'MAT_G1_%'
  AND n.numero_grado = 1
ON CONFLICT DO NOTHING;

-- Grado 2° → todos los ejes con clave MAT_G2_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'MAT_G2_%'
  AND n.numero_grado = 2
ON CONFLICT DO NOTHING;

-- Grado 3° → todos los ejes con clave MAT_G3_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'MAT_G3_%'
  AND n.numero_grado = 3
ON CONFLICT DO NOTHING;

-- Grado 4° → todos los ejes con clave MAT_G4_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'MAT_G4_%'
  AND n.numero_grado = 4
ON CONFLICT DO NOTHING;

-- Grado 5° → todos los ejes con clave MAT_G5_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'MAT_G5_%'
  AND n.numero_grado = 5
ON CONFLICT DO NOTHING;

-- Grado 6° → todos los ejes con clave MAT_G6_*
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
CROSS JOIN niveles n
WHERE e.clave LIKE 'MAT_G6_%'
  AND n.numero_grado = 6
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4) Verificación final (queda como comentario informativo)
-- ============================================================================
--   SELECT COUNT(*) FROM ejes_tematicos
--   WHERE materia_id = (SELECT id FROM materias WHERE clave = 'MATEMATICAS');
--   -- Debe devolver 198
--
--   SELECT periodo_numero, tipo_saber_id, COUNT(*)
--   FROM ejes_tematicos
--   WHERE materia_id = (SELECT id FROM materias WHERE clave = 'MATEMATICAS')
--   GROUP BY periodo_numero, tipo_saber_id
--   ORDER BY periodo_numero, tipo_saber_id;
