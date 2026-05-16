package com.atara.deb.ataraapi.dto.catalogo;

import lombok.*;

import java.time.LocalDate;

/**
 * DTO para mostrar estudiantes en catálogos del wizard de sección
 * (creación y edición). Expone los campos que el wizard necesita para mostrar
 * tarjetas legibles (iniciales, edad, género) sin filtrar datos sensibles del
 * acudiente.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EstudianteCatalogoDto {
    private Long id;
    private String identificacion;
    private String nombreCompleto;
    /** Partes separadas para que la UI pueda calcular iniciales sin recortar nombres compuestos. */
    private String nombre;
    private String apellido1;
    private String apellido2;
    private LocalDate fechaNacimiento;
    /** Género del estudiante: M, F u O. */
    private String genero;
    private String estado;
}
