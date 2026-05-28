-- =============================================================================
-- V16: Flag para forzar cambio de contraseña en primer acceso
--
-- Cuando el admin crea un usuario, el sistema genera una contraseña temporal
-- y la envía por correo. En el primer inicio de sesión el sistema detecta
-- este flag y obliga al usuario a establecer una nueva contraseña antes de
-- acceder a la plataforma.
-- =============================================================================

ALTER TABLE usuarios
    ADD COLUMN debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN usuarios.debe_cambiar_password IS
    'TRUE cuando el usuario tiene una contraseña temporal asignada por el admin y debe cambiarla en su primer acceso.';
