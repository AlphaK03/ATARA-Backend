package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.alertatematica.AlertaTematicaResponseDto;
import com.atara.deb.ataraapi.model.AlertaTematica;
import com.atara.deb.ataraapi.model.DetalleEvaluacionSaber;
import com.atara.deb.ataraapi.model.EjeTematico;
import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.Materia;
import com.atara.deb.ataraapi.model.Periodo;
import com.atara.deb.ataraapi.model.Seccion;
import com.atara.deb.ataraapi.model.enums.EstadoAlerta;
import com.atara.deb.ataraapi.model.enums.NivelAlertaTematica;
import com.atara.deb.ataraapi.repository.AlertaTematicaRepository;
import com.atara.deb.ataraapi.repository.DetalleEvaluacionSaberRepository;
import com.atara.deb.ataraapi.repository.EstudianteRepository;
import com.atara.deb.ataraapi.repository.MatriculaRepository;
import com.atara.deb.ataraapi.repository.PeriodoRepository;
import com.atara.deb.ataraapi.repository.SeccionRepository;
import com.atara.deb.ataraapi.security.ContextoUsuario;
import com.atara.deb.ataraapi.security.ContextoUsuarioService;
import com.atara.deb.ataraapi.service.AlertaTematicaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AlertaTematicaServiceImpl implements AlertaTematicaService {

    private final AlertaTematicaRepository alertaRepository;
    private final DetalleEvaluacionSaberRepository detalleRepository;
    private final EstudianteRepository estudianteRepository;
    private final PeriodoRepository periodoRepository;
    private final SeccionRepository seccionRepository;
    private final MatriculaRepository matriculaRepository;
    private final ContextoUsuarioService contextoUsuarioService;

    public AlertaTematicaServiceImpl(
            AlertaTematicaRepository alertaRepository,
            DetalleEvaluacionSaberRepository detalleRepository,
            EstudianteRepository estudianteRepository,
            PeriodoRepository periodoRepository,
            SeccionRepository seccionRepository,
            MatriculaRepository matriculaRepository,
            ContextoUsuarioService contextoUsuarioService) {
        this.alertaRepository = alertaRepository;
        this.detalleRepository = detalleRepository;
        this.estudianteRepository = estudianteRepository;
        this.periodoRepository = periodoRepository;
        this.seccionRepository = seccionRepository;
        this.matriculaRepository = matriculaRepository;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @Override
    @Transactional
    public List<AlertaTematicaResponseDto> generarAlertasPorEstudiante(
            Long estudianteId, Long periodoId, Long seccionId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        // La sección acota la alerta a un docente concreto: validamos acceso a ambos.
        contexto.verificarSeccion(seccionId);
        contextoUsuarioService.verificarAccesoAlEstudiante(estudianteId, contexto);

        Estudiante estudiante = estudianteRepository.findById(estudianteId)
            .orElseThrow(() -> new NoSuchElementException("Estudiante no encontrado con ID: " + estudianteId));
        Periodo periodo = periodoRepository.findById(periodoId)
            .orElseThrow(() -> new NoSuchElementException("Periodo no encontrado con ID: " + periodoId));
        Seccion seccion = seccionRepository.findById(seccionId)
            .orElseThrow(() -> new NoSuchElementException("Sección no encontrada con ID: " + seccionId));

        return generarParaEstudianteEnSeccion(estudiante, periodo, seccion).stream()
            .map(this::toDto)
            .toList();
    }

    @Override
    @Transactional
    public List<AlertaTematicaResponseDto> generarAlertasPorSeccion(Long seccionId, Long periodoId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contexto.verificarSeccion(seccionId);

        Periodo periodo = periodoRepository.findById(periodoId)
            .orElseThrow(() -> new NoSuchElementException("Periodo no encontrado con ID: " + periodoId));
        Seccion seccion = seccionRepository.findById(seccionId)
            .orElseThrow(() -> new NoSuchElementException("Sección no encontrada con ID: " + seccionId));

        // Solo los estudiantes matriculados en ESTA sección.
        List<Long> estudianteIds = matriculaRepository.findBySeccionId(seccionId).stream()
            .map(m -> m.getEstudiante().getId())
            .distinct()
            .toList();

        List<AlertaTematicaResponseDto> todasAlertas = new ArrayList<>();
        for (Long estId : estudianteIds) {
            Estudiante estudiante = estudianteRepository.findById(estId).orElse(null);
            if (estudiante == null) continue;
            generarParaEstudianteEnSeccion(estudiante, periodo, seccion)
                .forEach(a -> todasAlertas.add(toDto(a)));
        }
        return todasAlertas;
    }

    /**
     * Núcleo compartido: regenera las alertas temáticas de un estudiante ACOTADAS a
     * una sección concreta. Lee solo las evaluaciones de esa sección, limpia las
     * alertas previas de esa misma sección (no las de otra) y persiste las nuevas con
     * {@code seccion} asignada. Así dos docentes con el mismo estudiante en secciones
     * distintas nunca se pisan los datos (Bug 2).
     */
    private List<AlertaTematica> generarParaEstudianteEnSeccion(
            Estudiante estudiante, Periodo periodo, Seccion seccion) {

        List<DetalleEvaluacionSaber> detalles = detalleRepository
            .findByEstudiantePeriodoYSeccion(estudiante.getId(), periodo.getId(), seccion.getId());
        if (detalles.isEmpty()) {
            return List.of();
        }

        List<AlertaTematica> alertasGeneradas = calcularAlertas(estudiante, periodo, seccion, detalles);
        return alertaRepository.saveAll(alertasGeneradas);
    }

    @Override
    public List<AlertaTematicaResponseDto> obtenerAlertasPorEstudiante(Long estudianteId, Long periodoId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contextoUsuarioService.verificarAccesoAlEstudiante(estudianteId, contexto);

        List<AlertaTematica> alertas = contexto.esAdmin()
            // ADMIN / COORDINADOR: visión global del estudiante (todas sus secciones).
            ? alertaRepository.findByEstudianteIdAndPeriodoId(estudianteId, periodoId)
            // DOCENTE: solo las alertas de las secciones que le pertenecen.
            : alertaRepository.findByEstudianteIdAndPeriodoIdAndSeccionIdIn(
                estudianteId, periodoId, contexto.seccionIds());

        return alertas.stream().map(this::toDto).toList();
    }

    @Override
    public List<AlertaTematicaResponseDto> obtenerAlertasPorSeccion(Long seccionId, Long periodoId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contexto.verificarSeccion(seccionId);

        // Lectura ACOTADA por sección: solo las alertas generadas en esta sección,
        // no las de otra sección/docente sobre los mismos estudiantes (Bug 2).
        return alertaRepository.findBySeccionIdAndPeriodoId(seccionId, periodoId)
            .stream()
            .map(this::toDto)
            .toList();
    }

    private List<AlertaTematica> calcularAlertas(
            Estudiante estudiante, Periodo periodo, Seccion seccion, List<DetalleEvaluacionSaber> detalles) {

        Map<String, List<DetalleEvaluacionSaber>> porMateriaYEje = detalles.stream()
            .collect(Collectors.groupingBy(
                d -> claveMateriaYEje(d.getEvaluacionSaber().getMateria().getId(), d.getEjeTematico().getId()),
                LinkedHashMap::new,
                Collectors.toList()));

        List<AlertaTematica> alertas = new ArrayList<>();

        for (List<DetalleEvaluacionSaber> detallesPorEje : porMateriaYEje.values()) {
            DetalleEvaluacionSaber primerDetalle = detallesPorEje.get(0);
            EjeTematico eje = primerDetalle.getEjeTematico();
            Materia materia = primerDetalle.getEvaluacionSaber().getMateria();

            // Limpieza ACOTADA por sección: no toca las alertas de otra sección/docente.
            limpiarAlertasExistentes(estudiante.getId(), periodo.getId(), eje.getId(), materia.getId(), seccion.getId());

            BigDecimal suma = BigDecimal.ZERO;
            for (DetalleEvaluacionSaber detalle : detallesPorEje) {
                suma = suma.add(BigDecimal.valueOf(detalle.getValor()));
            }

            BigDecimal promedio = suma.divide(
                BigDecimal.valueOf(detallesPorEje.size()),
                2,
                RoundingMode.HALF_UP
            );

            NivelAlertaTematica nivel = determinarNivel(promedio);
            if (nivel == NivelAlertaTematica.SIN_ALERTA) {
                continue;
            }

            String nombreEstudiante = estudiante.getNombre() + " " + estudiante.getApellido1();
            String motivo = generarMotivo(nombreEstudiante, materia, eje, promedio, nivel, detallesPorEje.size());

            alertas.add(AlertaTematica.builder()
                .estudiante(estudiante)
                .periodo(periodo)
                .seccion(seccion)
                .ejeTematico(eje)
                .materia(materia)
                .promedio(promedio)
                .nivelAlerta(nivel)
                .motivo(motivo)
                .estado(EstadoAlerta.ACTIVA)
                .build());
        }

        return alertas;
    }

    /**
     * Borra (vía DELETE bulk inmediato) las alertas previas de este eje/materia
     * EN ESTA SECCIÓN antes de regenerarlas. El DELETE se ejecuta antes de los INSERT
     * de la regeneración, evitando colisiones con el índice único; e incluir
     * {@code seccionId} garantiza que no se eliminan alertas de otra sección/docente.
     */
    private void limpiarAlertasExistentes(
            Long estudianteId, Long periodoId, Integer ejeId, Integer materiaId, Long seccionId) {
        alertaRepository.eliminarPorEjeMateriaSeccion(estudianteId, periodoId, ejeId, materiaId, seccionId);
    }

    private String claveMateriaYEje(Integer materiaId, Integer ejeId) {
        return materiaId + ":" + ejeId;
    }

    private NivelAlertaTematica determinarNivel(BigDecimal promedio) {
        if (promedio.compareTo(new BigDecimal("2.00")) <= 0) {
            return NivelAlertaTematica.ALTA;
        } else if (promedio.compareTo(new BigDecimal("3.00")) <= 0) {
            return NivelAlertaTematica.MEDIA;
        }
        return NivelAlertaTematica.SIN_ALERTA;
    }

    private String generarMotivo(
            String nombreEstudiante,
            Materia materia,
            EjeTematico eje,
            BigDecimal promedio,
            NivelAlertaTematica nivel,
            int totalEvals) {
        String tipoSaber = eje.getTipoSaber().getNombre();
        String nivelTexto = nivel == NivelAlertaTematica.ALTA
            ? "requiere intervención inmediata"
            : "requiere seguimiento activo";

        return String.format(
            "%s obtuvo un promedio de %s/5.00 en %s, eje '%s' (%s) con base en %d evaluación(es) del periodo. %s.",
            nombreEstudiante,
            promedio.toPlainString(),
            materia.getNombre(),
            eje.getNombre(),
            tipoSaber,
            totalEvals,
            nivelTexto.substring(0, 1).toUpperCase() + nivelTexto.substring(1)
        );
    }

    private AlertaTematicaResponseDto toDto(AlertaTematica alerta) {
        String nombreCompleto = alerta.getEstudiante().getNombre() + " " + alerta.getEstudiante().getApellido1()
            + (alerta.getEstudiante().getApellido2() != null ? " " + alerta.getEstudiante().getApellido2() : "");

        return AlertaTematicaResponseDto.builder()
            .id(alerta.getId())
            .estudianteId(alerta.getEstudiante().getId())
            .estudianteNombreCompleto(nombreCompleto)
            .periodoId(alerta.getPeriodo().getId())
            .periodoNombre(alerta.getPeriodo().getNombre())
            .seccionId(alerta.getSeccion().getId())
            .seccionNombre(alerta.getSeccion().getNombre())
            .ejeTemaaticoId(alerta.getEjeTematico().getId())
            .ejeNombre(alerta.getEjeTematico().getNombre())
            .ejeClave(alerta.getEjeTematico().getClave())
            .materiaId(alerta.getMateria().getId())
            .materiaNombre(alerta.getMateria().getNombre())
            .tipoSaberId(alerta.getEjeTematico().getTipoSaber().getId())
            .tipoSaberNombre(alerta.getEjeTematico().getTipoSaber().getNombre())
            .promedio(alerta.getPromedio())
            .nivelAlerta(alerta.getNivelAlerta().name())
            .motivo(alerta.getMotivo())
            .estado(alerta.getEstado().name())
            .fechaGeneracion(alerta.getFechaGeneracion() != null
                ? alerta.getFechaGeneracion().toLocalDateTime() : null)
            .build();
    }
}
