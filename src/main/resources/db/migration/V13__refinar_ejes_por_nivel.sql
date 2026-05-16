-- =============================================================================
-- V13: Refinar asignaciones eje ↔ nivel para reflejar el currículo MEP CR
--
-- Problema detectado tras V12:
--   La semilla de V12 fue demasiado permisiva. Para Español, Ciencias y
--   Estudios Sociales asignó los 21 ejes a TODOS los grados (1°-6°), y para
--   Matemáticas a partir de 4° también aparecían los 7 ejes. Resultado:
--   un estudiante de 4° grado seguía viendo 7 ejes en cada saber conceptual
--   sin diferenciación real entre grados.
--
-- Esta migración:
--   1. Limpia la tabla ejes_tematicos_niveles (re-seed completo).
--   2. Inserta el mapeo refinado por currículo costarricense:
--      cada bloque temático tiene un rango de grados en el que es
--      pedagógicamente apropiado, según el Programa de Estudio del MEP.
--
-- Las claves se reparten así por bloque (la regla aplica simétricamente a
-- Conceptual / Procedimental / Actitudinal — prefijos C_/P_/A_, MC_/MP_/MA_,
-- CC_/CP_/CA_, SC_/SP_/SA_):
--
--   ESPAÑOL
--     - FONOLOGICA       → 1°-3°  (alfabetización inicial)
--     - GRAMATICA        → 2°-6°  (no en 1°, aún se aprende a leer/escribir)
--     - LITERATURA       → 3°-6°  (apreciación literaria a partir de 3°)
--     - COMPRENSION, VOCABULARIO, PRODUCCION, EXPRESION_ORAL → 1°-6°
--
--   CIENCIAS
--     - MATERIA          → 2°-6°
--     - ECOSISTEMAS      → 2°-6°
--     - METODO           → 3°-6°  (método científico desde 3°)
--     - TECNOLOGIA       → 5°-6°  (impacto de la tecnología en grados superiores)
--     - SERES_VIVOS, CUERPO, FENOMENOS → 1°-6°
--
--   ESTUDIOS SOCIALES
--     - DERECHOS         → 3°-6°
--     - POLITICA         → 4°-6°  (organización política — más abstracto)
--     - ECONOMIA         → 5°-6°  (conceptos económicos en grados superiores)
--     - HISTORIA, GEOGRAFIA, IDENTIDAD, SOCIEDAD → 1°-6°
--
--   MATEMÁTICAS
--     - FRACCIONES       → 3°-6°
--     - ESTADISTICA      → 3°-6°
--     - ALGEBRA          → 5°-6°  (V12 lo tenía en 4°; lo movemos para que 4°
--                                  no tenga los 7 ejes y se note la diferencia)
--     - NUMEROS, GEOMETRIA, PROBLEMAS, RAZONAMIENTO → 1°-6°
--
-- Conteo esperado por grado y materia (saber Conceptual; los otros saberes
-- replican el mismo conteo):
--
--   |  Grado |  Mat | Esp | Cien | Soc |
--   |--------|------|-----|------|-----|
--   |   1°   |  4   |  5  |  3   |  4  |
--   |   2°   |  4   |  6  |  5   |  4  |
--   |   3°   |  6   |  7  |  6   |  5  |
--   |   4°   |  6   |  6  |  6   |  6  |
--   |   5°   |  7   |  6  |  7   |  7  |
--   |   6°   |  7   |  6  |  7   |  7  |
--
-- Tras esta migración, un docente de 4° grado verá 6 ejes (no 7) en cada
-- saber conceptual de cualquier materia, y los grados 1°-3° tendrán subconjuntos
-- visiblemente menores.
-- =============================================================================

-- Limpieza completa (V13 reemplaza por completo la seed de V12).
DELETE FROM ejes_tematicos_niveles;

-- ===========================================================================
-- 1) ESPAÑOL
-- ===========================================================================

-- 1a) Bloques 1°-6° (transversales): COMPRENSION, VOCABULARIO, PRODUCCION, EXPRESION_ORAL
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'ESPANOL'
  AND n.numero_grado BETWEEN 1 AND 6
  AND e.clave IN (
      'C_COMPRENSION',    'P_COMPRENSION',    'A_COMPRENSION',
      'C_VOCABULARIO',    'P_VOCABULARIO',    'A_VOCABULARIO',
      'C_PRODUCCION',     'P_PRODUCCION',     'A_PRODUCCION',
      'C_EXPRESION_ORAL', 'P_EXPRESION_ORAL', 'A_EXPRESION_ORAL'
  )
ON CONFLICT DO NOTHING;

-- 1b) FONOLOGICA → solo 1°-3° (alfabetización inicial)
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'ESPANOL'
  AND n.numero_grado BETWEEN 1 AND 3
  AND e.clave IN ('C_FONOLOGICA', 'P_FONOLOGICA', 'A_FONOLOGICA')
ON CONFLICT DO NOTHING;

-- 1c) GRAMATICA → 2°-6° (no en 1°)
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'ESPANOL'
  AND n.numero_grado BETWEEN 2 AND 6
  AND e.clave IN ('C_GRAMATICA', 'P_GRAMATICA', 'A_GRAMATICA')
ON CONFLICT DO NOTHING;

-- 1d) LITERATURA → 3°-6°
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'ESPANOL'
  AND n.numero_grado BETWEEN 3 AND 6
  AND e.clave IN ('C_LITERATURA', 'P_LITERATURA', 'A_LITERATURA')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 2) CIENCIAS
-- ===========================================================================

-- 2a) Bloques 1°-6°: SERES_VIVOS, CUERPO, FENOMENOS
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'CIENCIAS'
  AND n.numero_grado BETWEEN 1 AND 6
  AND e.clave IN (
      'CC_SERES_VIVOS', 'CP_SERES_VIVOS', 'CA_SERES_VIVOS',
      'CC_CUERPO',      'CP_CUERPO',      'CA_CUERPO',
      'CC_FENOMENOS',   'CP_FENOMENOS',   'CA_FENOMENOS'
  )
ON CONFLICT DO NOTHING;

-- 2b) MATERIA, ECOSISTEMAS → 2°-6°
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'CIENCIAS'
  AND n.numero_grado BETWEEN 2 AND 6
  AND e.clave IN (
      'CC_MATERIA',     'CP_MATERIA',     'CA_MATERIA',
      'CC_ECOSISTEMAS', 'CP_ECOSISTEMAS', 'CA_ECOSISTEMAS'
  )
ON CONFLICT DO NOTHING;

-- 2c) METODO → 3°-6° (método científico desde 3°)
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'CIENCIAS'
  AND n.numero_grado BETWEEN 3 AND 6
  AND e.clave IN ('CC_METODO', 'CP_METODO', 'CA_METODO')
ON CONFLICT DO NOTHING;

-- 2d) TECNOLOGIA → 5°-6° (impacto de la tecnología)
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'CIENCIAS'
  AND n.numero_grado BETWEEN 5 AND 6
  AND e.clave IN ('CC_TECNOLOGIA', 'CP_TECNOLOGIA', 'CA_TECNOLOGIA')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 3) ESTUDIOS SOCIALES
-- ===========================================================================

-- 3a) Bloques 1°-6°: HISTORIA, GEOGRAFIA, IDENTIDAD, SOCIEDAD
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'ESTUDIOS_SOCIALES'
  AND n.numero_grado BETWEEN 1 AND 6
  AND e.clave IN (
      'SC_HISTORIA',  'SP_HISTORIA',  'SA_HISTORIA',
      'SC_GEOGRAFIA', 'SP_GEOGRAFIA', 'SA_GEOGRAFIA',
      'SC_IDENTIDAD', 'SP_IDENTIDAD', 'SA_IDENTIDAD',
      'SC_SOCIEDAD',  'SP_SOCIEDAD',  'SA_SOCIEDAD'
  )
ON CONFLICT DO NOTHING;

-- 3b) DERECHOS → 3°-6°
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'ESTUDIOS_SOCIALES'
  AND n.numero_grado BETWEEN 3 AND 6
  AND e.clave IN ('SC_DERECHOS', 'SP_DERECHOS', 'SA_DERECHOS')
ON CONFLICT DO NOTHING;

-- 3c) POLITICA → 4°-6° (organización política)
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'ESTUDIOS_SOCIALES'
  AND n.numero_grado BETWEEN 4 AND 6
  AND e.clave IN ('SC_POLITICA', 'SP_POLITICA', 'SA_POLITICA')
ON CONFLICT DO NOTHING;

-- 3d) ECONOMIA → 5°-6° (conceptos económicos)
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'ESTUDIOS_SOCIALES'
  AND n.numero_grado BETWEEN 5 AND 6
  AND e.clave IN ('SC_ECONOMIA', 'SP_ECONOMIA', 'SA_ECONOMIA')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 4) MATEMÁTICAS
-- ===========================================================================

-- 4a) Bloques 1°-6°: NUMEROS, GEOMETRIA, PROBLEMAS, RAZONAMIENTO
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'MATEMATICAS'
  AND n.numero_grado BETWEEN 1 AND 6
  AND e.clave IN (
      'MC_NUMEROS',      'MP_NUMEROS',      'MA_NUMEROS',
      'MC_GEOMETRIA',    'MP_GEOMETRIA',    'MA_GEOMETRIA',
      'MC_PROBLEMAS',    'MP_PROBLEMAS',    'MA_PROBLEMAS',
      'MC_RAZONAMIENTO', 'MP_RAZONAMIENTO', 'MA_RAZONAMIENTO'
  )
ON CONFLICT DO NOTHING;

-- 4b) FRACCIONES, ESTADISTICA → 3°-6°
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'MATEMATICAS'
  AND n.numero_grado BETWEEN 3 AND 6
  AND e.clave IN (
      'MC_FRACCIONES',  'MP_FRACCIONES',  'MA_FRACCIONES',
      'MC_ESTADISTICA', 'MP_ESTADISTICA', 'MA_ESTADISTICA'
  )
ON CONFLICT DO NOTHING;

-- 4c) ALGEBRA → 5°-6° (movido desde 4° en V12 para que 4° no tenga los 7 ejes)
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'MATEMATICAS'
  AND n.numero_grado BETWEEN 5 AND 6
  AND e.clave IN ('MC_ALGEBRA', 'MP_ALGEBRA', 'MA_ALGEBRA')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 5) EDUCACIÓN FÍSICA — preservar lo que estaba en V12 (1°-6° si hay ejes)
-- ===========================================================================
INSERT INTO ejes_tematicos_niveles (eje_tematico_id, nivel_id)
SELECT e.id, n.id
FROM ejes_tematicos e
JOIN materias m ON m.id = e.materia_id
CROSS JOIN niveles n
WHERE m.clave = 'EDUCACION_FISICA'
  AND n.numero_grado BETWEEN 1 AND 6
ON CONFLICT DO NOTHING;
