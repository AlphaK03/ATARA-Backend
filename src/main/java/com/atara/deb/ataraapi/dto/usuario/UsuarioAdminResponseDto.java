package com.atara.deb.ataraapi.dto.usuario;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioAdminResponseDto {
    private Long id;
    private String nombre;
    private String apellidos;
    private String correo;
    private String rol;
    private String estado;
    /** Materias actualmente asignadas al usuario (vacío si no es DOCENTE o no tiene). */
    private List<Integer> materiaIds;
}
