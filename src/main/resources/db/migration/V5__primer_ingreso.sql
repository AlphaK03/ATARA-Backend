-- =====================================================================
-- V5: Campo primer_ingreso en usuarios
-- =====================================================================
-- Permite identificar si un usuario está accediendo a la plataforma
-- por primera vez, independientemente de cómo fue registrado.
-- Los usuarios existentes se marcan como FALSE (ya han ingresado).
-- Los nuevos usuarios heredan el DEFAULT TRUE.

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS primer_ingreso boolean NOT NULL DEFAULT TRUE;

-- Usuarios ya existentes no son "primer ingreso"
UPDATE public.usuarios SET primer_ingreso = FALSE;

COMMENT ON COLUMN public.usuarios.primer_ingreso IS
    'TRUE mientras el usuario no haya completado su primer acceso a la plataforma. '
    'Se pone FALSE en el primer login exitoso. El frontend usa este flag para mostrar '
    'el tutorial de bienvenida (auto-registro) o flujos de onboarding.';
