package com.atara.deb.ataraapi.dto.piad;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Resumen del resultado de una importación masiva PIAD.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportarPiadResponseDto {

    /** Total de filas recibidas. */
    private int total;

    /** Estudiantes nuevos insertados en la tabla general. */
    private int creados;

    /** Estudiantes que ya existían y se reutilizaron (no se reinsertaron). */
    private int reutilizados;

    /** Matrículas nuevas creadas en la sección. */
    private int matriculados;

    /** Estudiantes que ya pertenecían a la sección (omitidos sin error). */
    private int yaMatriculados;

    /** Filas con error inesperado (la importación no se detiene por ellas). */
    private int errores;

    private List<FilaImportacionResultadoDto> detalle;
}
