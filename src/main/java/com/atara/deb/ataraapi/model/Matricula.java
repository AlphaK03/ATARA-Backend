package com.atara.deb.ataraapi.model;

import com.atara.deb.ataraapi.model.enums.EstadoMatricula;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "matriculas",
    // Un estudiante puede estar en varias secciones del mismo año (una por
    // docente/materia), pero no dos veces en la misma sección. Ver migración V23.
    uniqueConstraints = @UniqueConstraint(
        name = "uq_estudiante_por_seccion",
        columnNames = {"estudiante_id", "seccion_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Matricula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estudiante_id", nullable = false)
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seccion_id", nullable = false)
    private Seccion seccion;

    // Denormalizado desde secciones para poder aplicar UNIQUE (estudiante_id, anio_lectivo_id)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "anio_lectivo_id", nullable = false)
    private AnioLectivo anioLectivo;

    // CHECK (estado IN ('ACTIVO','RETIRADO'))
    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 10)
    private EstadoMatricula estado;

    @Column(name = "fecha_matricula", nullable = false)
    private LocalDate fechaMatricula;

    @Column(name = "observaciones")
    private String observaciones;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
