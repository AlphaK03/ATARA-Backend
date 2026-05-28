package com.atara.deb.ataraapi.dto.saber;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EjeTemaaticoResponseDto {
    private Integer id;
    private String clave;
    private String nombre;
    private String descripcion;
    private Short orden;
    private Integer tipoSaberId;
    private String tipoSaberNombre;
    private Integer materiaId;
    private String materiaNombre;
    /**
     * Trimestre asociado al eje (1, 2 o 3). NULL = transversal — aplica
     * a cualquier trimestre. Permite al frontend identificar a qué trimestre
     * pertenece cada eje sin reconsultar al backend.
     */
    private Short periodoNumero;
}
