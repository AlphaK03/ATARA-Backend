-- =============================================================================
-- V25 — Mitigación de credenciales sembradas conocidas (auditoría C-04 / C-05)
-- =============================================================================
-- Las migraciones V2 (admin@atara.mep.go.cr [ADMIN], mgarcia, jperez, avargas) y
-- V9 (kcortes@atara.mep.go.cr [DOCENTE]) sembraron cuentas con la contraseña
-- pública "Admin1234!" (todas comparten el mismo hash BCrypt). No se pueden
-- modificar esas migraciones (los checksums de Flyway lo impiden), así que aquí
-- forzamos el cambio de contraseña en el próximo inicio de sesión.
--
-- El backend (JwtAuthenticationFilter) bloquea con 403 toda operación distinta de
-- /api/auth/* mientras debe_cambiar_password = TRUE; por tanto, conocer
-- "Admin1234!" deja de conceder acceso utilizable: solo permite establecer una
-- contraseña nueva. Tras el primer cambio, el flag se limpia automáticamente
-- (AuthServiceImpl.cambiarPassword) y la cuenta opera con normalidad.
--
-- Se identifican por el hash conocido para cubrir las 5 cuentas de forma robusta,
-- sin depender de la lista exacta de correos.
-- =============================================================================

UPDATE usuarios
   SET debe_cambiar_password = TRUE
 WHERE password = '$2a$10$F1U30x64ierJnoOw7Dx8MuaqkbgIVzfdrZ38.uQRGz24uivyd96dm';
