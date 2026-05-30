package com.atara.deb.ataraapi.dto.piad;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Petición de importación masiva desde una Lista PIAD ya revisada.
 * El servicio procesa cada estudiante de forma idempotente: reutiliza el
 * registro si ya existe, lo crea si no, y lo matricula en la sección solo
 * cuando aún no lo está. Nunca falla por duplicados.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportarPiadRequestDto {

    @NotNull(message = "La sección destino es obligatoria")
    private Long seccionId;

    @NotNull(message = "El año lectivo es obligatorio")
    private Long anioLectivoId;

    /** Opcional; si no se envía, se usa la fecha actual del servidor. */
    private LocalDate fechaMatricula;

    @NotEmpty(message = "Debe enviarse al menos un estudiante")
    @Size(max = 500, message = "No se pueden importar más de 500 estudiantes en una sola operación")
    @Valid
    private List<EstudianteImportarDto> estudiantes;
}
