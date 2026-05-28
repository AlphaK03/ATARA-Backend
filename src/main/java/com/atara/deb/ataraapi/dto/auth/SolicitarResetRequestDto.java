package com.atara.deb.ataraapi.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SolicitarResetRequestDto {
    @NotBlank @Email
    private String correo;
}
