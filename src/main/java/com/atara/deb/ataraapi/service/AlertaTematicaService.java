package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.alertatematica.AlertaTematicaResponseDto;

import java.util.List;

public interface AlertaTematicaService {

    /**
     * Genera (regenera) las alertas temáticas de un estudiante en una sección concreta.
     * La sección es obligatoria: la alerta pertenece al contexto de un docente y solo
     * se calcula sobre las evaluaciones hechas en esa sección.
     */
    List<AlertaTematicaResponseDto> generarAlertasPorEstudiante(Long estudianteId, Long periodoId, Long seccionId);

    List<AlertaTematicaResponseDto> generarAlertasPorSeccion(Long seccionId, Long periodoId);

    List<AlertaTematicaResponseDto> obtenerAlertasPorEstudiante(Long estudianteId, Long periodoId);

    List<AlertaTematicaResponseDto> obtenerAlertasPorSeccion(Long seccionId, Long periodoId);
}
