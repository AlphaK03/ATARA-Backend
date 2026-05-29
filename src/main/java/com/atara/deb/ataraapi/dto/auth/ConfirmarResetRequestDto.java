package com.atara.deb.ataraapi.dto.auth;

import com.atara.deb.ataraapi.validation.PasswordSegura;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ConfirmarResetRequestDto {
    @NotBlank @Email
    private String correo;

    @NotBlank @Size(min = 4, max = 4)
    private String codigo;

    @NotBlank
    @Size(min = 8, max = 100, message = "La contraseña debe tener entre 8 y 100 caracteres.")
    @PasswordSegura
    private String nuevaPassword;
}
