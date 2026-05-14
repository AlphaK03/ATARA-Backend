package com.atara.deb.ataraapi.dto.seccion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeccionRequestDto {

    @NotBlank
    @Size(max = 10)
    private String nombre;          // 'A', 'B', 'C', …

    @NotNull
    private Long nivelId;

    @NotNull
    private Long centroId;

    @NotNull
    private Long anioLectivoId;

    /**
     * Docente titular (nullable).
     * Si el usuario autenticado tiene rol DOCENTE este campo se IGNORA: el creador
     * queda automáticamente como titular. Solo ADMIN puede asignar un docente distinto.
     */
    private Long docenteId;

    /** Capacidad máxima de la sección (nullable). */
    private Short capacidad;

    /**
     * IDs de docentes adicionales (co-docentes) que se enlazan a la sección
     * a través de la tabla intermedia {@code usuarios_secciones}.
     * Opcional. El docente titular y el creador se autoincluyen, no es necesario repetirlos aquí.
     */
    private List<Long> docentesAdicionalesIds;

    /**
     * IDs de estudiantes que serán matriculados ACTIVAMENTE en la sección
     * (en el año lectivo de la propia sección) durante la misma transacción de creación.
     * Opcional. Si un estudiante ya tiene matrícula en ese año lectivo,
     * la operación falla con 400.
     */
    private List<Long> estudiantesIds;
}
