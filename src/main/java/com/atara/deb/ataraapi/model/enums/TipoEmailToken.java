package com.atara.deb.ataraapi.model.enums;

/**
 * Tipos de token persistidos en la tabla {@code email_tokens}. Coinciden
 * uno a uno con la constraint CHECK en V14.
 */
public enum TipoEmailToken {
    /** Link enviado al crear usuario para confirmar que el correo existe. */
    VERIFICACION_EMAIL,
    /** Código numérico enviado al solicitar reset de contraseña. */
    RESET_PASSWORD
}
