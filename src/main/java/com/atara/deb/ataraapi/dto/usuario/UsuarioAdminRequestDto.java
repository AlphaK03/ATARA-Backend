package com.atara.deb.ataraapi.dto.usuario;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioAdminRequestDto {

    @NotBlank
    @Size(max = 100)
    private String nombre;

    @NotBlank
    @Size(max = 150)
    private String apellidos;

    @NotBlank
    @Email
    @Size(max = 150)
    private String correo;

    /** Solo en PUT: si se envía, reemplaza la contraseña del usuario. En POST se ignora. */
    @Size(min = 8, max = 100)
    private String password;

    /** Nombre del rol: ADMIN, DOCENTE o COORDINADOR. */
    @NotBlank
    private String rol;

    /** Solo aplica en PUT. En POST el usuario siempre se crea como ACTIVO. */
    private String estado;

    /**
     * IDs de las materias a asignar al usuario (tabla {@code usuario_materias}).
     * Solo aplica cuando el rol es DOCENTE.
     *
     * <p>POST: si es {@code null} o vacío se asignan TODAS las materias por
     * defecto, replicando el comportamiento del seed inicial. Sin esto los
     * docentes nuevos quedan sin acceso a las preguntas del wizard de evaluación.
     *
     * <p>PUT: si es {@code null} no se tocan las asignaciones existentes.
     * Si es una lista vacía o con elementos, se reemplazan por completo.
     */
    private List<Integer> materiaIds;
}
