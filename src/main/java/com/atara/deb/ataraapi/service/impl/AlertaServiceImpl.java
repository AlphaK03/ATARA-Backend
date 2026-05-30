package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.alerta.AlertaResponseDto;
import com.atara.deb.ataraapi.model.Alerta;
import com.atara.deb.ataraapi.model.Matricula;
import com.atara.deb.ataraapi.repository.AlertaRepository;
import com.atara.deb.ataraapi.repository.MatriculaRepository;
import com.atara.deb.ataraapi.security.ContextoUsuario;
import com.atara.deb.ataraapi.security.ContextoUsuarioService;
import com.atara.deb.ataraapi.service.AlertaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AlertaServiceImpl implements AlertaService {

    private final AlertaRepository alertaRepository;
    private final MatriculaRepository matriculaRepository;
    private final ContextoUsuarioService contextoUsuarioService;

    public AlertaServiceImpl(AlertaRepository alertaRepository, MatriculaRepository matriculaRepository,
                             ContextoUsuarioService contextoUsuarioService) {
        this.alertaRepository = alertaRepository;
        this.matriculaRepository = matriculaRepository;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @Override
    public List<AlertaResponseDto> getAlertsByStudent(Long studentId, Long periodId) {
        // Control de acceso: un docente solo puede ver alertas de estudiantes de sus secciones.
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contextoUsuarioService.verificarAccesoAlEstudiante(studentId, contexto);

        List<Alerta> alertas = alertaRepository.findByEstudianteIdAndPeriodoId(studentId, periodId);
        return alertas.stream().map(this::toDto).toList();
    }

    @Override
    public List<AlertaResponseDto> getAlertsBySection(Long sectionId, Long periodId) {
        // Control de acceso: un docente solo puede ver alertas de sus secciones.
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contexto.verificarSeccion(sectionId);

        // Obtiene los IDs de estudiantes matriculados en la sección
        List<Long> estudianteIds = matriculaRepository.findBySeccionId(sectionId).stream()
            .map(m -> m.getEstudiante().getId().longValue())
            .toList();

        if (estudianteIds.isEmpty()) {
            return List.of();
        }

        List<Alerta> alertas = alertaRepository.findByEstudianteIdInAndPeriodoId(estudianteIds, periodId);
        return alertas.stream().map(this::toDto).toList();
    }

    private AlertaResponseDto toDto(Alerta alerta) {
        AlertaResponseDto dto = new AlertaResponseDto();
        dto.setId(alerta.getId());
        dto.setStudentId(alerta.getEstudiante().getId());
        dto.setStudentName(alerta.getEstudiante().getNombre()
            + " " + alerta.getEstudiante().getApellido1());
        dto.setContentId(alerta.getContenido().getId());
        dto.setContentName(alerta.getContenido().getNombre());
        dto.setAlertLevel(alerta.getNivelAlerta().name());
        dto.setReason(alerta.getMotivo());
        dto.setStatus(alerta.getEstado().name());
        if (alerta.getFechaGeneracion() != null) {
            dto.setGeneratedAt(alerta.getFechaGeneracion().toLocalDateTime());
        }
        return dto;
    }
}
