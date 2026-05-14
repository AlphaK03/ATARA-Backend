package com.atara.deb.ataraapi.dto.catalogo;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Payload para crear o actualizar un Centro Educativo desde el rol ADMIN.
 * Solo {@code nombre} es obligatorio; el resto de campos son opcionales
 * pero, si se envían, deben respetar los límites máximos de la base de datos.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CentroEducativoRequestDto {

    @NotBlank
    @Size(max = 200)
    private String nombre;

    @Size(max = 10)
    private String circuito;

    @Size(max = 100)
    private String direccionRegional;

    @Size(max = 20)
    private String telefono;

    @Email
    @Size(max = 150)
    private String correo;
}
