package com.atara.deb.ataraapi.dto.seccion;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeccionResponseDto {
    private Long id;
    private String nombre;
    private Long anioLectivoId;
    private Short anioLectivoAnio;
    private Long nivelId;
    private String nivelNombre;
    private Short nivelGrado;
    private Long centroId;
    private String centroNombre;
    /** ID del docente titular (puede ser null si no hay titular). Útil para que el cliente sepa si el usuario actual es titular. */
    private Long docenteId;
    private String docenteNombreCompleto;
    private Short capacidad;
    private int totalEstudiantes;
}
