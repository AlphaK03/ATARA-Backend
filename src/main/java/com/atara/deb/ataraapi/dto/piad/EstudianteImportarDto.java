package com.atara.deb.ataraapi.dto.piad;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Una fila de la importación PIAD ya revisada por el usuario. Contiene SOLO los
 * campos que se persisten en la tabla {@code estudiantes} — los mismos del alta
 * manual: identificación, nombre y apellidos. El nivel/grupo del PDF son
 * referencia y no se envían.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EstudianteImportarDto {

    @NotBlank(message = "La identificación es obligatoria")
    @Size(max = 25)
    private String identificacion;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100)
    private String nombre;

    @NotBlank(message = "El primer apellido es obligatorio")
    @Size(max = 100)
    private String apellido1;

    @Size(max = 100)
    private String apellido2;
}
