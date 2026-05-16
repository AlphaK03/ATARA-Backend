package com.atara.deb.ataraapi.dto.auth;

import java.util.Set;

/**
 * Respuesta del endpoint GET /api/auth/me.
 * Incluye las asignaciones del usuario para que el frontend
 * pueda pre-filtrar su vista sin llamadas adicionales.
 */
public class MeResponseDto {

    private Long userId;
    private String correo;
    private String nombre;
    private String apellidos;
    private String rol;
    /** IDs de las secciones asignadas. Vacío si el usuario es ADMIN o COORDINADOR. */
    private Set<Long> seccionIds;
    /** IDs de las materias asignadas. Vacío si el usuario es ADMIN o COORDINADOR. */
    private Set<Integer> materiaIds;
    /** IDs de los centros educativos donde el usuario tiene secciones asignadas. */
    private Set<Long> centroIds;

    public MeResponseDto() {}

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }

    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }

    public Set<Long> getSeccionIds() { return seccionIds; }
    public void setSeccionIds(Set<Long> seccionIds) { this.seccionIds = seccionIds; }

    public Set<Integer> getMateriaIds() { return materiaIds; }
    public void setMateriaIds(Set<Integer> materiaIds) { this.materiaIds = materiaIds; }

    public Set<Long> getCentroIds() { return centroIds; }
    public void setCentroIds(Set<Long> centroIds) { this.centroIds = centroIds; }
}
