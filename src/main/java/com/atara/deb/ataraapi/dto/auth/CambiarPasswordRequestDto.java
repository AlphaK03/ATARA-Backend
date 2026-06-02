package com.atara.deb.ataraapi.dto.auth;

import com.atara.deb.ataraapi.validation.PasswordSegura;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CambiarPasswordRequestDto {
    // Opcional: requerido solo en cambio voluntario; null en flujo de primer login forzado
    private String passwordActual;

    @NotBlank
    @Size(min = 8, max = 100, message = "La contraseña debe tener entre 8 y 100 caracteres.")
    @PasswordSegura
    private String nuevaPassword;
}
