package com.atara.deb.ataraapi.model;

import com.atara.deb.ataraapi.model.enums.EstadoAlerta;
import com.atara.deb.ataraapi.model.enums.NivelAlertaTematica;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "alertas_tematicas",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_alerta_tematica",
        columnNames = {"estudiante_id", "periodo_id", "eje_tematico_id", "materia_id", "seccion_id", "nivel_alerta"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertaTematica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estudiante_id", nullable = false)
    private Estudiante estudiante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "periodo_id", nullable = false)
    private Periodo periodo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "eje_tematico_id", nullable = false)
    private EjeTematico ejeTematico;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "materia_id", nullable = false)
    private Materia materia;

    /**
     * Sección (y por tanto docente) en cuyo contexto se generó la alerta.
     * Acota la alerta a un docente concreto: un estudiante puede estar en varias
     * secciones del mismo año (una por docente/materia) y cada docente solo debe
     * ver/regenerar las alertas de SU sección. ON DELETE CASCADE en BD.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seccion_id", nullable = false)
    private Seccion seccion;

    @Column(name = "promedio", nullable = false, precision = 4, scale = 2)
    private BigDecimal promedio;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_alerta", nullable = false, length = 15)
    private NivelAlertaTematica nivelAlerta;

    @Column(name = "motivo", nullable = false)
    private String motivo;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 15)
    private EstadoAlerta estado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generada_por")
    private Usuario generadaPor;

    @Column(name = "fecha_generacion", insertable = false, updatable = false)
    private OffsetDateTime fechaGeneracion;

    @Column(name = "fecha_resolucion")
    private OffsetDateTime fechaResolucion;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;
}
