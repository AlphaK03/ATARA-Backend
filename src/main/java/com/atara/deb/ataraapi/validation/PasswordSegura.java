package com.atara.deb.ataraapi.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Valida que una contraseña cumpla la política mínima de seguridad de ATARA:
 * al menos 2 letras mayúsculas, 2 letras minúsculas y 2 dígitos.
 *
 * <p>Se aplica sobre el campo {@code nuevaPassword} de los DTO de cambio y
 * restablecimiento de contraseña para que la regla viva en un único lugar y
 * sea reutilizable. La longitud mínima/máxima se sigue declarando con
 * {@link jakarta.validation.constraints.Size} en cada DTO.</p>
 */
@Documented
@Constraint(validatedBy = PasswordSeguraValidator.class)
@Target({FIELD, PARAMETER, ANNOTATION_TYPE})
@Retention(RUNTIME)
public @interface PasswordSegura {

    String message() default
            "La contraseña debe incluir al menos 2 mayúsculas, 2 minúsculas y 2 números.";

    /** Cantidad mínima de letras mayúsculas requeridas. */
    int minMayusculas() default 2;

    /** Cantidad mínima de letras minúsculas requeridas. */
    int minMinusculas() default 2;

    /** Cantidad mínima de dígitos requeridos. */
    int minDigitos() default 2;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
