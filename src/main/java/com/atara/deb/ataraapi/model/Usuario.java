package com.atara.deb.ataraapi.model;

import com.atara.deb.ataraapi.model.enums.EstadoUsuario;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "usuarios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "apellidos", nullable = false, length = 150)
    private String apellidos;

    @Column(name = "correo", nullable = false, length = 150, unique = true)
    private String correo;

    // Hash BCrypt — nunca texto plano
    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rol_id", nullable = false)
    private Rol rol;

    // CHECK (estado IN ('ACTIVO','INACTIVO'))
    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 10)
    private EstadoUsuario estado;

    @Column(name = "ultimo_acceso")
    private OffsetDateTime ultimoAcceso;

    /**
     * TRUE si el usuario ya confirmó su correo vía el link de verificación.
     * Los usuarios sembrados en V2 quedan en TRUE (son reales). Los creados
     * via /api/admin/usuarios arrancan en FALSE hasta que abren el link.
     * El login NO está bloqueado por este flag (modo soft: solo banner).
     */
    @Builder.Default
    @Column(name = "email_verificado", nullable = false)
    private Boolean emailVerificado = false;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    /** Secciones asignadas al usuario (tabla join: usuarios_secciones). */
    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "usuarios_secciones",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "seccion_id")
    )
    private List<Seccion> seccionesAsignadas = new ArrayList<>();

    /** Materias asignadas al usuario (tabla join: usuario_materias). */
    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "usuario_materias",
            joinColumns = @JoinColumn(name = "usuario_id"),
            inverseJoinColumns = @JoinColumn(name = "materia_id")
    )
    private List<Materia> materiasAsignadas = new ArrayList<>();
}
