package com.atara.deb.ataraapi.dto.estudiante;

import com.atara.deb.ataraapi.model.enums.EstadoEstudiante;
import com.atara.deb.ataraapi.model.enums.Genero;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class EstudianteRequestDto {

    @NotBlank
    @Size(max = 25)
    private String identificacion;

    @NotBlank
    @Size(max = 100)
    private String nombre;

    @NotBlank
    @Size(max = 100)
    private String apellido1;

    @Size(max = 100)
    private String apellido2;

    private LocalDate fechaNacimiento;

    private Genero genero;

    @Size(max = 200)
    private String nombreAcudiente;

    @Size(max = 20)
    private String telefonoAcudiente;

    @Email
    @Size(max = 150)
    private String correoAcudiente;

    /** Opcional en creación (default ACTIVO). En actualización: ACTIVO, INACTIVO o TRASLADADO. */
    private EstadoEstudiante estado;

    public String getIdentificacion() { return identificacion; }
    public void setIdentificacion(String identificacion) { this.identificacion = identificacion; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido1() { return apellido1; }
    public void setApellido1(String apellido1) { this.apellido1 = apellido1; }

    public String getApellido2() { return apellido2; }
    public void setApellido2(String apellido2) { this.apellido2 = apellido2; }

    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }

    public Genero getGenero() { return genero; }
    public void setGenero(Genero genero) { this.genero = genero; }

    public String getNombreAcudiente() { return nombreAcudiente; }
    public void setNombreAcudiente(String nombreAcudiente) { this.nombreAcudiente = nombreAcudiente; }

    public String getTelefonoAcudiente() { return telefonoAcudiente; }
    public void setTelefonoAcudiente(String telefonoAcudiente) { this.telefonoAcudiente = telefonoAcudiente; }

    public String getCorreoAcudiente() { return correoAcudiente; }
    public void setCorreoAcudiente(String correoAcudiente) { this.correoAcudiente = correoAcudiente; }

    public EstadoEstudiante getEstado() { return estado; }
    public void setEstado(EstadoEstudiante estado) { this.estado = estado; }
}
