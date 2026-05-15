package com.atara.deb.ataraapi.dto.catalogo;

import lombok.*;

/**
 * DTO ligero para mostrar estudiantes en catálogos del wizard de sección
 * (creación y edición). No expone datos del acudiente ni timestamps —
 * solo lo mínimo necesario para que el frontend permita buscar y seleccionar.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EstudianteCatalogoDto {
    private Long id;
    private String identificacion;
    private String nombreCompleto;
    private String estado;
}
