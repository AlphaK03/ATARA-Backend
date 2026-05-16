package com.atara.deb.ataraapi.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload de {@code POST /api/auth/cambiar-password}. Requiere autenticación;
 * el usuario afectado es siempre el del JWT, no se acepta un id en el body
 * para evitar que un usuario cambie la contraseña de otro.
 */
public class CambiarPasswordRequestDto {

    @NotBlank(message = "La contraseña actual es obligatoria")
    private String passwordActual;

    @NotBlank(message = "La nueva contraseña es obligatoria")
    @Size(min = 8, max = 100, message = "La nueva contraseña debe tener entre 8 y 100 caracteres")
    private String passwordNueva;

    public CambiarPasswordRequestDto() {}

    public String getPasswordActual() { return passwordActual; }
    public void setPasswordActual(String passwordActual) { this.passwordActual = passwordActual; }

    public String getPasswordNueva() { return passwordNueva; }
    public void setPasswordNueva(String passwordNueva) { this.passwordNueva = passwordNueva; }
}
