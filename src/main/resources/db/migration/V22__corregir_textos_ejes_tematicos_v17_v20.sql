-- =============================================================================
-- V22: Corrección de textos truncados, caracteres PUA, parentesis abiertos y
--      mayúsculas iniciales en los ejes temáticos cargados por V17–V20.
--
-- Contexto
-- --------
-- Las migraciones V17 (Ciencias), V18 (Estudios Sociales), V19 (Matemática) y
-- V20 (Español) cargaron 813 criterios MEP como ejes temáticos, extraídos
-- automáticamente de los PDFs oficiales. La extracción produjo cuatro tipos de
-- defectos que aparecían en el wizard de evaluación, mostrándole al docente
-- nombres incompletos o con basura visual:
--
--   1) TRUNCAMIENTO al alcanzar ~78-80 caracteres (límite previo del VARCHAR
--      antes de V17). Ejemplos: "Características de las estaciones seca",
--      "Algunos de los fenómenos en", "Plantas y animales según el medio en".
--
--   2) CARACTERES PUA (Private Use Area, U+F081 y U+F070) que provienen de
--      glifos no-Unicode embebidos en el PDF de Matemática. Renderizan como
--      un cuadrado vacío o un icono basura entre palabras, p.ej.
--      "ope  raciones" (la sílaba se fracturó en una división de página).
--
--   3) PARÉNTESIS ABIERTOS sin cerrar (la causa del "()" reportado por el
--      usuario): el extractor cortó listas entre paréntesis del PDF,
--      p.ej. "(panfletos" sin coma de continuación ni paréntesis de cierre.
--
--   4) MAYÚSCULA INICIAL omitida en V18: al limpiar el verbo de inicio del
--      criterio ("Reconocer la historia personal..." → "historia personal..."),
--      la primera letra quedó en minúscula y al docente le parece
--      gramaticalmente incorrecto.
--
-- Esta migración solo modifica la columna `nombre` (y en 4 casos también la
-- columna `descripcion`) de los ejes ya cargados, identificándolos por su
-- clave única CIE_*, SOC_*, MAT_* o ESP_*. No re-crea filas, no toca claves
-- ni IDs, no afecta detalles de evaluación ya capturados.
--
-- Idempotente: cada UPDATE filtra por clave única; volver a correr produce
-- el mismo resultado.
-- =============================================================================


-- =============================================================================
-- BLOQUE 1 — CIENCIAS (V17): truncados y nombres genéricos como "Sol" o
-- "Funciones", reescritos a frases descriptivas tomadas del criterio MEP.
-- =============================================================================

UPDATE ejes_tematicos SET nombre = 'Funciones de las partes de la planta y su relación con otros seres vivos' WHERE clave = 'CIE_G1_T1_10';
UPDATE ejes_tematicos SET nombre = 'Situaciones que afectan los componentes vivos y no vivos del ambiente' WHERE clave = 'CIE_G1_T2_05';
UPDATE ejes_tematicos SET nombre = 'Acciones que contribuyen a la solución de problemas ambientales' WHERE clave = 'CIE_G1_T2_06';
UPDATE ejes_tematicos SET nombre = 'Objetos materiales relacionados con la producción de luz y calor' WHERE clave = 'CIE_G1_T2_11';
UPDATE ejes_tematicos SET nombre = 'Acciones preventivas con respecto al uso de la luz y el calor del Sol' WHERE clave = 'CIE_G1_T3_05';
UPDATE ejes_tematicos SET nombre = 'Características de las estaciones seca y lluviosa en Costa Rica' WHERE clave = 'CIE_G1_T3_09';
UPDATE ejes_tematicos SET nombre = 'Medidas para la prevención de accidentes y enfermedades' WHERE clave = 'CIE_G2_T1_04';
UPDATE ejes_tematicos SET nombre = 'Soluciones para evitar accidentes y enfermedades en la comunidad' WHERE clave = 'CIE_G2_T1_05';
UPDATE ejes_tematicos SET nombre = 'Situaciones que afectan la calidad de los alimentos' WHERE clave = 'CIE_G2_T1_11';
UPDATE ejes_tematicos SET nombre = 'Beneficios obtenidos del trabajo producido por algunas máquinas' WHERE clave = 'CIE_G2_T3_05';
UPDATE ejes_tematicos SET nombre = 'El Sol como la estrella que brinda luz y calor a la Tierra' WHERE clave = 'CIE_G2_T3_09';
UPDATE ejes_tematicos SET nombre = 'Plantas y animales según el medio en que viven y su tipo de alimentación' WHERE clave = 'CIE_G3_T2_02';
UPDATE ejes_tematicos SET nombre = 'Aspectos del uso racional de los componentes de la naturaleza' WHERE clave = 'CIE_G3_T2_05';
UPDATE ejes_tematicos SET nombre = 'Manejo adecuado de máquinas y su contribución al uso racional de la energía' WHERE clave = 'CIE_G3_T2_10';
UPDATE ejes_tematicos SET nombre = 'Algunas ventajas y desventajas de los adelantos científicos en máquinas' WHERE clave = 'CIE_G3_T3_01';
UPDATE ejes_tematicos SET nombre = 'Instrumentos de medición y el Sistema Internacional de Unidades' WHERE clave = 'CIE_G3_T3_03';
UPDATE ejes_tematicos SET nombre = 'Importancia de las mediciones en el uso racional de los materiales del entorno' WHERE clave = 'CIE_G3_T3_05';
UPDATE ejes_tematicos SET nombre = 'Datos meteorológicos para la predicción del estado del tiempo' WHERE clave = 'CIE_G3_T3_07';
UPDATE ejes_tematicos SET nombre = 'Información meteorológica para la prevención de situaciones de riesgo' WHERE clave = 'CIE_G3_T3_08';
UPDATE ejes_tematicos SET nombre = 'Órganos de los sistemas reproductores masculino y femenino' WHERE clave = 'CIE_G4_T1_10';
UPDATE ejes_tematicos SET nombre = 'Medidas preventivas para el buen funcionamiento de los sistemas reproductores' WHERE clave = 'CIE_G4_T1_11';
UPDATE ejes_tematicos SET nombre = 'Aspectos que determinan la biodiversidad de Costa Rica' WHERE clave = 'CIE_G4_T2_03';
UPDATE ejes_tematicos SET nombre = 'Relación entre masa, calor y temperatura en situaciones cotidianas' WHERE clave = 'CIE_G4_T3_01';
UPDATE ejes_tematicos SET nombre = 'Medidas preventivas ante situaciones con uso del calor y la temperatura' WHERE clave = 'CIE_G4_T3_02';
UPDATE ejes_tematicos SET nombre = 'Fenómenos en los que interviene la luz y sus aplicaciones' WHERE clave = 'CIE_G4_T3_03';
UPDATE ejes_tematicos SET nombre = 'Medidas preventivas ante situaciones en que la luz puede afectar al ser humano' WHERE clave = 'CIE_G4_T3_05';
UPDATE ejes_tematicos SET nombre = 'Acontecimientos en la observación astronómica y exploración espacial' WHERE clave = 'CIE_G5_T3_09';
UPDATE ejes_tematicos SET nombre = 'Glándulas del sistema endocrino y sus funciones en el cuerpo humano' WHERE clave = 'CIE_G6_T1_04';
UPDATE ejes_tematicos SET nombre = 'Efectos y consecuencias de eventos naturales y actividades humanas' WHERE clave = 'CIE_G6_T2_03';
UPDATE ejes_tematicos SET nombre = 'Efectos del uso de fuentes de energías contaminantes y no contaminantes' WHERE clave = 'CIE_G6_T2_07';
UPDATE ejes_tematicos SET nombre = 'Cambios físicos y cambios químicos en los materiales del entorno' WHERE clave = 'CIE_G6_T2_11';
UPDATE ejes_tematicos SET nombre = 'Crecimiento de la población humana y demanda de materia prima y energía' WHERE clave = 'CIE_G6_T3_02';
UPDATE ejes_tematicos SET nombre = 'Actividades humanas que contribuyen al equilibrio ecológico' WHERE clave = 'CIE_G6_T3_08';

-- V17: una descripción quedó sin punto final.
UPDATE ejes_tematicos
   SET descripcion = 'Apreciar la diversidad de las características físicas de la piel de las personas, tomando en cuenta la etnia a la que pertenecen.'
 WHERE clave = 'CIE_G2_T1_09';


-- =============================================================================
-- BLOQUE 2 — ESTUDIOS SOCIALES (V18): truncados específicos y, al final del
-- bloque, capitalización de la primera letra en todos los ejes SOC_* cuya
-- inicial quedó en minúscula tras eliminar el verbo de inicio del criterio.
-- =============================================================================

-- 2a) Truncados específicos identificados a ~78-80 chars.
UPDATE ejes_tematicos SET nombre = 'Historia personal como parte de una familia y de la sociedad' WHERE clave = 'SOC_G1_T1_03';
UPDATE ejes_tematicos SET nombre = 'La escuela como espacio para sentirse seguro y protegido' WHERE clave = 'SOC_G1_T3_02';
UPDATE ejes_tematicos SET nombre = 'Ubicación de lugares con nociones básicas de orientación geográfica' WHERE clave = 'SOC_G2_T2_04';
UPDATE ejes_tematicos SET nombre = 'Importancia de las historias comunales y la identidad cantonal' WHERE clave = 'SOC_G2_T2_08';
UPDATE ejes_tematicos SET nombre = 'Importancia del patrimonio cultural y natural para la sociedad' WHERE clave = 'SOC_G3_T2_06';
UPDATE ejes_tematicos SET nombre = 'Respeto al patrimonio histórico, cultural y natural de la provincia' WHERE clave = 'SOC_G3_T2_12';
UPDATE ejes_tematicos SET nombre = 'Historia de la región donde se encuentra el centro educativo' WHERE clave = 'SOC_G4_T2_02';
UPDATE ejes_tematicos SET nombre = 'Participación ciudadana para enfrentar los retos de la sociedad' WHERE clave = 'SOC_G6_T2_08';
UPDATE ejes_tematicos SET nombre = 'Retos de la sociedad costarricense y espacios de participación ciudadana' WHERE clave = 'SOC_G6_T3_02';

-- 2b) Reescritura de algunos nombres SOC con preposiciones iniciales que se
--     leen como gramaticalmente incompletas (capitalizar la "a", "e" o "hacia"
--     no resuelve el problema; necesitan formularse como sustantivo).
UPDATE ejes_tematicos SET nombre = 'Reconocimiento de la historia personal de vida' WHERE clave = 'SOC_G1_T1_07';
UPDATE ejes_tematicos SET nombre = 'Importancia del centro educativo al que pertenece' WHERE clave = 'SOC_G1_T3_08';
UPDATE ejes_tematicos SET nombre = 'Valoración del trabajo realizado por otras personas' WHERE clave = 'SOC_G1_T3_09';
UPDATE ejes_tematicos SET nombre = 'Respeto al desarrollo de prácticas contra el matonismo (bullying)' WHERE clave = 'SOC_G1_T3_10';
UPDATE ejes_tematicos SET nombre = 'Aprecio del conocimiento del pasado del cantón' WHERE clave = 'SOC_G2_T1_10';
UPDATE ejes_tematicos SET nombre = 'Promoción de la participación en diversas actividades del cantón' WHERE clave = 'SOC_G2_T1_13';
UPDATE ejes_tematicos SET nombre = 'Prácticas de ubicación geográfica en el contexto cantonal' WHERE clave = 'SOC_G2_T2_10';
UPDATE ejes_tematicos SET nombre = 'Importancia de las instituciones cantonales y la seguridad personal' WHERE clave = 'SOC_G2_T2_13';
UPDATE ejes_tematicos SET nombre = 'Reconstrucción del pasado del cantón' WHERE clave = 'SOC_G2_T2_14';
UPDATE ejes_tematicos SET nombre = 'Respeto a las instituciones que velan por el desarrollo cantonal' WHERE clave = 'SOC_G2_T3_14';
UPDATE ejes_tematicos SET nombre = 'Aplicación de las nociones básicas de cartografía' WHERE clave = 'SOC_G3_T1_11';
UPDATE ejes_tematicos SET nombre = 'Uso adecuado del mapa en prácticas de ubicación geográfica' WHERE clave = 'SOC_G3_T1_12';
UPDATE ejes_tematicos SET nombre = 'Aprecio hacia las celebraciones de la Patria' WHERE clave = 'SOC_G3_T1_14';
UPDATE ejes_tematicos SET nombre = 'Reconocimiento de la importancia del relieve en el desarrollo' WHERE clave = 'SOC_G3_T2_11';
UPDATE ejes_tematicos SET nombre = 'Aprecio hacia el estudio del espacio geográfico' WHERE clave = 'SOC_G3_T2_10';
UPDATE ejes_tematicos SET nombre = 'Aprecio hacia las celebraciones de la Patria' WHERE clave = 'SOC_G3_T2_14';
UPDATE ejes_tematicos SET nombre = 'Aprecio hacia las celebraciones de la Patria' WHERE clave = 'SOC_G3_T3_13';
UPDATE ejes_tematicos SET nombre = 'Características básicas de las formas de relieve' WHERE clave = 'SOC_G4_T1_06';
UPDATE ejes_tematicos SET nombre = 'Respeto a las leyes y normas de los espacios democráticos' WHERE clave = 'SOC_G4_T2_10';
UPDATE ejes_tematicos SET nombre = 'Identidad cultural de la región' WHERE clave = 'SOC_G4_T2_07';
UPDATE ejes_tematicos SET nombre = 'Aplicación de las nociones básicas de cartografía' WHERE clave = 'SOC_G5_T1_10';
UPDATE ejes_tematicos SET nombre = 'Uso adecuado del mapa en prácticas de ubicación geográfica' WHERE clave = 'SOC_G5_T1_11';
UPDATE ejes_tematicos SET nombre = 'Respeto a la diversidad cultural y lingüística costarricense' WHERE clave = 'SOC_G5_T1_16';
UPDATE ejes_tematicos SET nombre = 'Respeto hacia el manejo y resolución pacífica de conflictos' WHERE clave = 'SOC_G6_T1_09';
UPDATE ejes_tematicos SET nombre = 'Reconocimiento de la influencia de las reformas liberales en la sociedad' WHERE clave = 'SOC_G6_T1_10';
UPDATE ejes_tematicos SET nombre = 'Respeto hacia la búsqueda de soluciones a desafíos contemporáneos' WHERE clave = 'SOC_G6_T3_09';

-- 2c) RED DE SEGURIDAD: capitalizar la primera letra de cualquier nombre
--     SOC_* que aún empiece en minúscula. Cubre las decenas de casos que no
--     ameritan reescritura individual; el cambio es puramente visual.
UPDATE ejes_tematicos
   SET nombre = upper(left(nombre, 1)) || substring(nombre, 2)
 WHERE clave LIKE 'SOC\_%' ESCAPE '\'
   AND left(nombre, 1) ~ '[a-záéíóúñü]';


-- =============================================================================
-- BLOQUE 3 — MATEMÁTICA (V19): caracteres PUA U+F081 / U+F070 y truncados.
-- Cada nombre se reescribe a su forma legible; las descripciones se limpian
-- de los mismos caracteres y de fragmentos rotos por la extracción del PDF.
-- =============================================================================

-- 3a) Casos con PUA (U+F081 o U+F070): nombre + descripcion reescritos.
UPDATE ejes_tematicos
   SET nombre      = 'Problemas y operaciones con sumas y restas hasta 100',
       descripcion = 'Resolver problemas y operaciones con sumas y restas de números naturales cuyos resultados sean menores que 100.'
 WHERE clave = 'MAT_G1_T1_09';

UPDATE ejes_tematicos
   SET nombre      = 'Uso correcto de los símbolos =, + y –',
       descripcion = 'Utilizar correctamente los símbolos =, + y –.'
 WHERE clave = 'MAT_G1_T1_10';

UPDATE ejes_tematicos
   SET nombre      = 'Números menores que 100 por composición y descomposición aditiva',
       descripcion = 'Representar números menores que 100 mediante composición y descomposición aditiva.'
 WHERE clave = 'MAT_G1_T1_11';

UPDATE ejes_tematicos
   SET nombre      = 'Cálculo mental de sumas y restas mediante diversas estrategias',
       descripcion = 'Calcular mentalmente sumas o restas mediante diversas estrategias.'
 WHERE clave = 'MAT_G1_T2_01';

UPDATE ejes_tematicos
   SET nombre      = 'Representación de números en la recta numérica',
       descripcion = 'Representar números en la recta numérica.'
 WHERE clave = 'MAT_G2_T1_04';

UPDATE ejes_tematicos
   SET nombre      = 'Doble de un número natural y mitad de números pares menores que 100',
       descripcion = 'Determinar el doble de un número natural y la mitad de números pares menores que 100.'
 WHERE clave = 'MAT_G2_T1_05';

UPDATE ejes_tematicos
   SET nombre      = 'Relación entre las operaciones suma y resta',
       descripcion = 'Aplicar la relación entre las operaciones suma y resta para la verificación de respuestas o resultados.'
 WHERE clave = 'MAT_G2_T1_06';

UPDATE ejes_tematicos
   SET nombre      = 'Multiplicación como adición repetida de grupos de igual tamaño',
       descripcion = 'Identificar la multiplicación como la adición repetida de grupos de igual tamaño.'
 WHERE clave = 'MAT_G2_T1_07';

UPDATE ejes_tematicos
   SET nombre      = 'Sumas, restas y multiplicaciones mediante cálculo mental y estimación',
       descripcion = 'Calcular sumas, restas y multiplicaciones utilizando diversas estrategias de cálculo mental y estimación.'
 WHERE clave = 'MAT_G2_T1_10';

UPDATE ejes_tematicos
   SET nombre      = 'Sucesiones de números de 10 en 10, de 100 en 100 o de 1000 en 1000',
       descripcion = 'Escribir sucesiones de números de 10 en 10, de 100 en 100 o de 1000 en 1000.'
 WHERE clave = 'MAT_G3_T1_02';

UPDATE ejes_tematicos
   SET nombre      = 'Números ordinales hasta el centésimo',
       descripcion = 'Identificar los números ordinales hasta el centésimo como la unión de vocablos asociados.'
 WHERE clave = 'MAT_G3_T1_03';

UPDATE ejes_tematicos
   SET nombre      = 'División como reparto equitativo o como agrupamiento',
       descripcion = 'Identificar la división como reparto equitativo o como agrupamiento.'
 WHERE clave = 'MAT_G3_T1_05';

UPDATE ejes_tematicos
   SET nombre      = 'Triple o quíntuple de números menores que 100',
       descripcion = 'Determinar el triple o el quíntuple de números menores que 100.'
 WHERE clave = 'MAT_G3_T1_06';

UPDATE ejes_tematicos
   SET nombre      = 'Fracciones homogéneas y heterogéneas',
       descripcion = 'Identificar fracciones homogéneas y heterogéneas.'
 WHERE clave = 'MAT_G5_T1_07';

UPDATE ejes_tematicos
   SET nombre      = 'Fracciones entre dos números naturales consecutivos',
       descripcion = 'Determinar fracciones entre dos números naturales consecutivos.'
 WHERE clave = 'MAT_G5_T1_09';

UPDATE ejes_tematicos
   SET nombre      = 'Número decimal en su notación desarrollada',
       descripcion = 'Representar un número decimal en su notación desarrollada.'
 WHERE clave = 'MAT_G5_T1_11';

UPDATE ejes_tematicos
   SET nombre      = 'Redondeo de un número decimal',
       descripcion = 'Redondear un número decimal.'
 WHERE clave = 'MAT_G5_T2_01';

UPDATE ejes_tematicos
   SET nombre      = 'Problemas con operaciones de números naturales y con decimales',
       descripcion = 'Resolver y plantear problemas donde se requiera el uso de la suma, la resta, la multiplicación y la división de números naturales y con decimales.'
 WHERE clave = 'MAT_G5_T2_02';

UPDATE ejes_tematicos
   SET nombre      = 'Relaciones entre dos cantidades variables en una expresión matemática',
       descripcion = 'Identificar y aplicar relaciones entre dos cantidades variables en una expresión matemática.'
 WHERE clave = 'MAT_G5_T3_02';

UPDATE ejes_tematicos
   SET nombre      = 'Relaciones de dependencia entre cantidades',
       descripcion = 'Determinar relaciones de dependencia entre cantidades.'
 WHERE clave = 'MAT_G5_T3_04';

UPDATE ejes_tematicos
   SET nombre      = 'Múltiplos de 10 como potencias de base 10',
       descripcion = 'Expresar múltiplos de 10 como potencias de base 10.'
 WHERE clave = 'MAT_G6_T1_04';

UPDATE ejes_tematicos
   SET nombre      = 'Fracciones equivalentes',
       descripcion = 'Identificar fracciones equivalentes.'
 WHERE clave = 'MAT_G6_T1_05';

UPDATE ejes_tematicos
   SET nombre      = 'Multiplicación y división de fracciones',
       descripcion = 'Multiplicar y dividir fracciones.'
 WHERE clave = 'MAT_G6_T1_06';

UPDATE ejes_tematicos
   SET nombre      = 'Inverso multiplicativo de un número natural o fraccionario',
       descripcion = 'Identificar el inverso multiplicativo de un número natural y/o fraccionario.'
 WHERE clave = 'MAT_G6_T1_07';

UPDATE ejes_tematicos
   SET nombre      = 'Problemas con suma, resta, multiplicación y división de naturales y decimales',
       descripcion = 'Resolver problemas donde se requiera el uso de la combinación de operaciones suma, resta, multiplicación y división de números naturales y con decimales.'
 WHERE clave = 'MAT_G6_T1_08';

UPDATE ejes_tematicos
   SET nombre      = 'Cálculo mental de potencias mediante diferentes estrategias',
       descripcion = 'Calcular mentalmente potencias mediante diferentes estrategias.'
 WHERE clave = 'MAT_G6_T1_09';

UPDATE ejes_tematicos
   SET nombre      = 'Operaciones con fracciones mediante el cálculo mental',
       descripcion = 'Determinar el resultado de operaciones con fracciones mediante el cálculo mental utilizando diferentes estrategias.'
 WHERE clave = 'MAT_G6_T1_10';

UPDATE ejes_tematicos
   SET nombre      = 'Uso del número π para calcular la medida de circunferencias',
       descripcion = 'Utilizar el número π para calcular la medida de circunferencias.'
 WHERE clave = 'MAT_G6_T2_03';

UPDATE ejes_tematicos
   SET nombre      = 'Proporción entre cantidades numéricas',
       descripcion = 'Analizar la proporción entre cantidades numéricas.'
 WHERE clave = 'MAT_G6_T3_03';

UPDATE ejes_tematicos
   SET nombre      = 'Sucesiones y patrones con números, figuras y representaciones geométricas',
       descripcion = 'Analizar sucesiones y patrones con números, de figuras y representaciones geométricas.'
 WHERE clave = 'MAT_G6_T3_05';

UPDATE ejes_tematicos
   SET nombre      = 'Representar algebraicamente una expresión matemática dada verbalmente',
       descripcion = 'Representar algebraicamente una expresión matemática dada verbalmente.'
 WHERE clave = 'MAT_G6_T3_06';

-- 3b) Truncados de Matemática sin PUA.
UPDATE ejes_tematicos SET nombre = 'Conteo para asociar conjuntos de objetos con su cardinalidad' WHERE clave = 'MAT_G1_T1_02';
UPDATE ejes_tematicos SET nombre = 'Correspondencias entre formas de representación de un número natural' WHERE clave = 'MAT_G1_T1_04';
UPDATE ejes_tematicos SET nombre = 'Interior, exterior y borde referidos a líneas cerradas' WHERE clave = 'MAT_G1_T2_03';
UPDATE ejes_tematicos SET nombre = 'Medidas con unidades arbitrarias como la cuarta' WHERE clave = 'MAT_G1_T2_07';
UPDATE ejes_tematicos SET nombre = 'Representación de cantidades usando la escritura de expresiones matemáticas' WHERE clave = 'MAT_G1_T3_07';
UPDATE ejes_tematicos SET nombre = 'Números menores que 1000 con los conceptos de centena, decena y unidad' WHERE clave = 'MAT_G2_T1_02';
UPDATE ejes_tematicos SET nombre = 'Problemas con sumas y restas de números naturales menores que 1000' WHERE clave = 'MAT_G2_T1_08';
UPDATE ejes_tematicos SET nombre = 'Semejanzas y diferencias en triángulos, cuadrados, rectángulos y cuadriláteros' WHERE clave = 'MAT_G2_T2_04';
UPDATE ejes_tematicos SET nombre = 'Sucesiones con figuras, geometría o números naturales según un patrón' WHERE clave = 'MAT_G2_T3_04';
UPDATE ejes_tematicos SET nombre = 'Análisis estadísticos para comunicar y argumentar respuestas a interrogantes' WHERE clave = 'MAT_G2_T3_10';
UPDATE ejes_tematicos SET nombre = 'Resultados seguros, probables o imposibles según la situación' WHERE clave = 'MAT_G2_T3_11';
UPDATE ejes_tematicos SET nombre = 'Pesos con el kilogramo y sus divisiones en ¼, ½ y ¾ de kg' WHERE clave = 'MAT_G3_T2_10';
UPDATE ejes_tematicos SET nombre = 'Sucesiones con figuras, geometría o números naturales según un patrón' WHERE clave = 'MAT_G3_T3_03';
UPDATE ejes_tematicos SET nombre = 'Problemas del contexto estudiantil con recolección y análisis de datos' WHERE clave = 'MAT_G3_T3_08';
UPDATE ejes_tematicos SET nombre = 'Análisis estadísticos para comunicar respuestas verbales y escritas' WHERE clave = 'MAT_G3_T3_10';
UPDATE ejes_tematicos SET nombre = 'Problemas con el algoritmo de la división de números naturales' WHERE clave = 'MAT_G4_T1_03';
UPDATE ejes_tematicos SET nombre = 'Problemas con suma, resta, multiplicación y división de números naturales' WHERE clave = 'MAT_G4_T1_07';
UPDATE ejes_tematicos SET nombre = 'Métodos y herramientas adecuados para la resolución de cálculos' WHERE clave = 'MAT_G4_T1_08';
UPDATE ejes_tematicos SET nombre = 'Planos en conexión con las caras de los prismas rectangulares' WHERE clave = 'MAT_G4_T2_06';
UPDATE ejes_tematicos SET nombre = 'Áreas con el metro cuadrado, sus múltiplos y submúltiplos' WHERE clave = 'MAT_G4_T2_09';
UPDATE ejes_tematicos SET nombre = 'Relación bancaria entre monedas y billetes de todas las denominaciones' WHERE clave = 'MAT_G4_T2_10';
UPDATE ejes_tematicos SET nombre = 'Patrones en sucesiones con figuras, geometría y números naturales' WHERE clave = 'MAT_G4_T3_05';
UPDATE ejes_tematicos SET nombre = 'Resultados a favor de la ocurrencia de un evento' WHERE clave = 'MAT_G4_T3_11';
UPDATE ejes_tematicos SET nombre = 'Fracción impropia en notación mixta y viceversa' WHERE clave = 'MAT_G5_T1_06';
UPDATE ejes_tematicos SET nombre = 'Perímetros y áreas de figuras en conexión con objetos del entorno' WHERE clave = 'MAT_G5_T2_03';
UPDATE ejes_tematicos SET nombre = 'Perímetro y área de triángulos, cuadrados, rectángulos y trapecios' WHERE clave = 'MAT_G5_T2_04';
UPDATE ejes_tematicos SET nombre = 'Perímetros y áreas de figuras planas compuestas' WHERE clave = 'MAT_G5_T2_05';
UPDATE ejes_tematicos SET nombre = 'Problemas con cálculo de perímetros y áreas de triángulos y cuadriláteros' WHERE clave = 'MAT_G5_T2_06';
UPDATE ejes_tematicos SET nombre = 'Diversas medidas en la resolución de problemas del entorno' WHERE clave = 'MAT_G5_T2_09';
UPDATE ejes_tematicos SET nombre = 'Fuentes potenciales de errores al recopilar datos con cuestionarios' WHERE clave = 'MAT_G5_T3_08';
UPDATE ejes_tematicos SET nombre = 'Recolección de datos mediante un cuestionario y resumen en base de datos' WHERE clave = 'MAT_G5_T3_09';
UPDATE ejes_tematicos SET nombre = 'Divisibilidad, divisor, factor y múltiplo de un número natural' WHERE clave = 'MAT_G6_T1_01';
UPDATE ejes_tematicos SET nombre = 'Problemas con cálculo de perímetros y áreas de diversas figuras' WHERE clave = 'MAT_G6_T1_11';
UPDATE ejes_tematicos SET nombre = 'Problemas aplicando porcentajes y regla de tres' WHERE clave = 'MAT_G6_T3_04';

-- 3c) Descripciones de Matemática con basura del extractor PDF.
UPDATE ejes_tematicos
   SET descripcion = 'Utilizar los análisis estadísticos para comunicar y argumentar respuestas a interrogantes que surgen de los problemas planteados.'
 WHERE clave = 'MAT_G2_T3_10';

UPDATE ejes_tematicos
   SET descripcion = 'Utilizar los análisis estadísticos para comunicar en forma verbal y escrita los argumentos que dan respuestas a los problemas contextuales.'
 WHERE clave = 'MAT_G3_T3_10';

UPDATE ejes_tematicos
   SET descripcion = 'Expresar una fracción impropia en notación mixta y viceversa.'
 WHERE clave = 'MAT_G5_T1_06';

-- 3d) Red de seguridad: si quedara algún carácter PUA en cualquier eje, eliminarlo.
UPDATE ejes_tematicos
   SET nombre      = regexp_replace(nombre,      '[-]+', '', 'g'),
       descripcion = regexp_replace(descripcion, '[-]+', '', 'g')
 WHERE nombre ~ '[-]' OR descripcion ~ '[-]';

-- Colapsar dobles espacios que pudieran haber quedado.
UPDATE ejes_tematicos
   SET nombre      = regexp_replace(trim(nombre),      '\s+', ' ', 'g'),
       descripcion = regexp_replace(trim(descripcion), '\s+', ' ', 'g')
 WHERE nombre ~ '\s\s' OR descripcion ~ '\s\s' OR nombre <> trim(nombre) OR descripcion <> trim(descripcion);


-- =============================================================================
-- BLOQUE 4 — ESPAÑOL (V20): paréntesis abiertos sin cerrar y truncados.
-- =============================================================================

-- 4a) Paréntesis huérfanos: reescribir nombre con lista corta y balanceada.
UPDATE ejes_tematicos SET nombre = 'Letras pertinentes para escribir enunciados (palabras, frases y oraciones)' WHERE clave = 'ESP_G1_T2_10';
UPDATE ejes_tematicos SET nombre = 'Lectura al decodificar enunciados (palabras, frases y oraciones)' WHERE clave = 'ESP_G1_T2_11';
UPDATE ejes_tematicos SET nombre = 'Correspondencia letra-fonema al formar enunciados (palabras, frases, oraciones)' WHERE clave = 'ESP_G1_T3_02';
UPDATE ejes_tematicos SET nombre = 'Lectura de textos literarios y no literarios (notas, mensajes, instrucciones)' WHERE clave = 'ESP_G1_T3_06';
UPDATE ejes_tematicos SET nombre = 'Adquisición progresiva de fluidez en la comprensión de lectura' WHERE clave = 'ESP_G2_T1_05';
UPDATE ejes_tematicos SET nombre = 'Estrategias de planificación, textualización y revisión al escribir textos' WHERE clave = 'ESP_G2_T3_03';
UPDATE ejes_tematicos SET nombre = 'Comprensión de textos informativos (panfletos, manuales, anuncios)' WHERE clave = 'ESP_G2_T3_08';
UPDATE ejes_tematicos SET nombre = 'Expresión oral con técnicas expositivas (debates, foros, presentaciones)' WHERE clave = 'ESP_G2_T3_11';
UPDATE ejes_tematicos SET nombre = 'Tipos de textos: expositivos, narrativos y descriptivos' WHERE clave = 'ESP_G4_T2_01';
UPDATE ejes_tematicos SET nombre = 'Estrategias de comprensión lectora (conocimientos previos, subrayado, resumen)' WHERE clave = 'ESP_G4_T2_05';
UPDATE ejes_tematicos SET nombre = 'Fuentes informativas (biblioteca, internet, entrevistas, documentales)' WHERE clave = 'ESP_G4_T2_07';
UPDATE ejes_tematicos SET nombre = 'Estrategias de exposición oral (resumir, repetir, resaltar ideas clave)' WHERE clave = 'ESP_G5_T1_08';
UPDATE ejes_tematicos SET nombre = 'Géneros literarios (poesía, cuento, novela, drama, leyenda)' WHERE clave = 'ESP_G5_T2_05';
UPDATE ejes_tematicos SET nombre = 'Estrategias de interpretación (inferencias, hipótesis, conclusiones)' WHERE clave = 'ESP_G5_T2_07';
UPDATE ejes_tematicos SET nombre = 'Búsqueda de información (biblioteca, internet, directorio telefónico)' WHERE clave = 'ESP_G5_T3_03';
UPDATE ejes_tematicos SET nombre = 'Tipos de lenguaje: coloquial, meta, formal y figurado' WHERE clave = 'ESP_G6_T1_07';
UPDATE ejes_tematicos SET nombre = 'Estrategias de interpretación (inferencias, hipótesis, conclusiones)' WHERE clave = 'ESP_G6_T1_09';
UPDATE ejes_tematicos SET nombre = 'Géneros literarios (poesía, cuento, novela, drama, leyenda)' WHERE clave = 'ESP_G6_T2_07';
UPDATE ejes_tematicos SET nombre = 'Estrategias de interpretación (dramatizaciones, lecturas, discusiones)' WHERE clave = 'ESP_G6_T2_09';
UPDATE ejes_tematicos SET nombre = 'Estrategias de análisis (preguntas, argumentaciones, foros, debates)' WHERE clave = 'ESP_G6_T3_02';
UPDATE ejes_tematicos SET nombre = 'Soportes escritos: biblioteca, internet y guía telefónica' WHERE clave = 'ESP_G6_T3_05';
UPDATE ejes_tematicos SET nombre = 'Estrategias de comprensión lectora (resúmenes, esquemas, mapas conceptuales)' WHERE clave = 'ESP_G6_T3_07';

-- 4b) Truncados de Español sin paréntesis huérfanos.
UPDATE ejes_tematicos SET nombre = 'Estrategias para fomentar la lectura apreciativa de textos literarios y no literarios' WHERE clave = 'ESP_G1_T2_04';
UPDATE ejes_tematicos SET nombre = 'Correspondencias entre escritura y oralidad al leer enunciados' WHERE clave = 'ESP_G1_T2_09';
UPDATE ejes_tematicos SET nombre = 'Calidad de los textos propios y ajenos para una comunicación fluida y clara' WHERE clave = 'ESP_G3_T3_01';
UPDATE ejes_tematicos SET nombre = 'Expresión oral como actividad que fomenta confianza y nuevos aprendizajes' WHERE clave = 'ESP_G4_T3_04';
UPDATE ejes_tematicos SET nombre = 'Estrategias de interpretación de mensajes de los medios de comunicación' WHERE clave = 'ESP_G5_T2_08';
UPDATE ejes_tematicos SET nombre = 'Normas básicas de interacción verbal en situaciones comunicativas formales' WHERE clave = 'ESP_G5_T3_01';
UPDATE ejes_tematicos SET nombre = 'Estrategias de interpretación de obras de arte plástico' WHERE clave = 'ESP_G6_T1_05';
UPDATE ejes_tematicos SET nombre = 'Uso correcto de normas ortográficas y gramaticales en los escritos' WHERE clave = 'ESP_G6_T2_10';
UPDATE ejes_tematicos SET nombre = 'Normas básicas de interacción verbal en situaciones comunicativas formales' WHERE clave = 'ESP_G6_T3_04';


-- =============================================================================
-- BLOQUE 5 — Paréntesis huérfanos también en Matemática (5 casos).
-- =============================================================================

UPDATE ejes_tematicos SET nombre = 'Clasificación de figuras planas según su forma' WHERE clave = 'MAT_G1_T2_05';
UPDATE ejes_tematicos SET nombre = 'Datos del contexto estudiantil (aula, escuela, hogar, comunidad)' WHERE clave = 'MAT_G1_T3_08';
UPDATE ejes_tematicos SET nombre = 'Clasificación de polígonos según el número de sus lados' WHERE clave = 'MAT_G3_T2_03';
UPDATE ejes_tematicos SET nombre = 'Elementos de los triángulos: lado, vértice, ángulo, base y altura' WHERE clave = 'MAT_G4_T1_09';
UPDATE ejes_tematicos SET nombre = 'Elementos de los cuadriláteros: lado, vértice, ángulo, base, altura, diagonal' WHERE clave = 'MAT_G4_T2_01';


-- =============================================================================
-- BLOQUE 6 — Saneamiento general final.
-- =============================================================================

-- Recortar espacios en blanco y comas finales sueltas en nombre.
UPDATE ejes_tematicos
   SET nombre = regexp_replace(trim(nombre), ',\s*$', '')
 WHERE nombre <> regexp_replace(trim(nombre), ',\s*$', '');

-- Si una descripción no termina en signo de puntuación, agregarle un punto.
UPDATE ejes_tematicos
   SET descripcion = descripcion || '.'
 WHERE descripcion !~ '[.?!)]$';

-- =============================================================================
-- Verificación (queda como comentario informativo)
-- =============================================================================
--
--   SELECT clave, length(nombre), nombre
--   FROM ejes_tematicos
--   WHERE nombre ~ '[-]'                      -- PUA
--      OR nombre ~ '\(\s'                                  -- "( "
--      OR nombre LIKE '% '                                 -- trailing space
--      OR nombre LIKE '%,'                                 -- trailing comma
--      OR (nombre ~ '^[a-z]' AND clave ~ '^(CIE|SOC|MAT|ESP)_')
--      OR nombre ~* '\s(de|la|el|los|las|del|en|con|por|y|o|un|una|al|que|su|a|para|sobre|entre|hacia|desde)\s*$'
--   ORDER BY clave;
--   -- Esperado: 0 filas.
