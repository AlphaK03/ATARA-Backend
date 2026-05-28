package com.atara.deb.ataraapi.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(
    name = "ejes_tematicos",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_eje_por_materia_tipo",
        columnNames = {"materia_id", "tipo_saber_id", "orden"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EjeTematico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "materia_id", nullable = false)
    private Materia materia;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tipo_saber_id", nullable = false)
    private TipoSaber tipoSaber;

    @Column(name = "clave", nullable = false, length = 30, unique = true)
    private String clave;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "descripcion")
    private String descripcion;

    @Column(name = "orden", nullable = false)
    private Short orden;

    /**
     * Trimestre al que aplica el eje (1, 2 o 3). NULL = aplicable a cualquier
     * trimestre. Columna agregada por V17 y poblada por V17/V18/V19/V20 para
     * permitir filtrar ejes por trimestre en el wizard de evaluación.
     */
    @Column(name = "periodo_numero")
    private Short periodoNumero;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
