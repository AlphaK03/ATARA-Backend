package com.atara.deb.ataraapi.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Implementación de {@link PasswordSegura}. Cuenta mayúsculas, minúsculas y
 * dígitos de la contraseña y verifica que se alcancen los mínimos configurados.
 *
 * <p>No valida longitud: eso lo cubre {@link jakarta.validation.constraints.Size}
 * en el DTO. Un valor {@code null} o en blanco se considera válido aquí para no
 * duplicar el mensaje de {@code @NotBlank}; la combinación de anotaciones en el
 * DTO garantiza que ambos casos queden cubiertos.</p>
 */
public class PasswordSeguraValidator implements ConstraintValidator<PasswordSegura, String> {

    private int minMayusculas;
    private int minMinusculas;
    private int minDigitos;

    @Override
    public void initialize(PasswordSegura constraint) {
        this.minMayusculas = constraint.minMayusculas();
        this.minMinusculas = constraint.minMinusculas();
        this.minDigitos = constraint.minDigitos();
    }

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        // Dejar que @NotBlank/@Size reporten el caso vacío.
        if (password == null || password.isBlank()) {
            return true;
        }

        int mayusculas = 0;
        int minusculas = 0;
        int digitos = 0;

        for (int i = 0; i < password.length(); i++) {
            char c = password.charAt(i);
            if (Character.isUpperCase(c)) {
                mayusculas++;
            } else if (Character.isLowerCase(c)) {
                minusculas++;
            } else if (Character.isDigit(c)) {
                digitos++;
            }
        }

        return mayusculas >= minMayusculas
                && minusculas >= minMinusculas
                && digitos >= minDigitos;
    }
}
