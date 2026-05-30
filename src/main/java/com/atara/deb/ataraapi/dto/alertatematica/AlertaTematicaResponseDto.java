package com.atara.deb.ataraapi.dto.alertatematica;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertaTematicaResponseDto {
    private Long id;
    private Long estudianteId;
    private String estudianteNombreCompleto;
    private Long periodoId;
    private String periodoNombre;
    private Long seccionId;
    private String seccionNombre;
    private Integer ejeTemaaticoId;
    private String ejeNombre;
    private String ejeClave;
    private Integer materiaId;
    private String materiaNombre;
    private Integer tipoSaberId;
    private String tipoSaberNombre;
    private BigDecimal promedio;
    private String nivelAlerta;
    private String motivo;
    private String estado;
    private LocalDateTime fechaGeneracion;
}
