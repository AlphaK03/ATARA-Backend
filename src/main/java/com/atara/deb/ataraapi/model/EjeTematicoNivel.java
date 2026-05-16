package com.atara.deb.ataraapi.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/**
 * Asociación N:M entre un eje temático y un nivel educativo. Define en qué
 * grados (1°–6°) es evaluable cada eje, evitando que el wizard de evaluación
 * muestre ejes que no aplican al grado del estudiante (e.g. "Álgebra" en 1°).
 *
 * <p>La constraint UNIQUE (eje_tematico_id, nivel_id) está en la DB.
 */
@Entity
@Table(
    name = "ejes_tematicos_niveles",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_eje_nivel",
        columnNames = {"eje_tematico_id", "nivel_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EjeTematicoNivel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "eje_tematico_id", nullable = false)
    private EjeTematico ejeTematico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nivel_id", nullable = false)
    private Nivel nivel;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
