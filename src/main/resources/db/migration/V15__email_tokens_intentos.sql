-- =============================================================================
-- V15: Contador de intentos fallidos en email_tokens
--
-- Motivación:
--   El código de reset bajó a 4 dígitos (V14 lo creaba con 6 para que fuera
--   más amigable). Con 4 dígitos hay solo 10.000 combinaciones, así que un
--   atacante podría hacer brute-force con curl en segundos.
--
--   Mitigación: contamos los intentos fallidos por token. Después de 5,
--   el código se invalida (se marca como usado) y el usuario debe solicitar
--   uno nuevo. La probabilidad de adivinar un código de 4 dígitos en 5
--   intentos es 5/10.000 = 0.05%, comparable a 6 dígitos sin contador.
--
--   Aplica solo a tokens de tipo RESET_PASSWORD (los de VERIFICACION_EMAIL
--   son UUIDs de 36 caracteres, no brute-forceables).
-- =============================================================================

ALTER TABLE email_tokens
    ADD COLUMN intentos INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN email_tokens.intentos IS
    'Número de validaciones fallidas. Tras 5 el token se invalida automáticamente para limitar brute-force del código de reset.';
