package com.atara.deb.ataraapi.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class SolicitarResetRequestDto {

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo no tiene un formato válido")
    private String correo;

    public SolicitarResetRequestDto() {}

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
}
