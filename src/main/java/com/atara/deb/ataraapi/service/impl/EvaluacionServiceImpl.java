package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.model.DetalleEvaluacion;
import com.atara.deb.ataraapi.model.Evaluacion;
import com.atara.deb.ataraapi.model.Usuario;
import com.atara.deb.ataraapi.repository.DetalleEvaluacionRepository;
import com.atara.deb.ataraapi.repository.EvaluacionRepository;
import com.atara.deb.ataraapi.security.ContextoUsuario;
import com.atara.deb.ataraapi.security.ContextoUsuarioService;
import com.atara.deb.ataraapi.service.EvaluacionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@Transactional
public class EvaluacionServiceImpl implements EvaluacionService {

    private final EvaluacionRepository evaluacionRepository;
    private final DetalleEvaluacionRepository detalleEvaluacionRepository;
    private final ContextoUsuarioService contextoUsuarioService;

    public EvaluacionServiceImpl(
            EvaluacionRepository evaluacionRepository,
            DetalleEvaluacionRepository detalleEvaluacionRepository,
            ContextoUsuarioService contextoUsuarioService) {
        this.evaluacionRepository = evaluacionRepository;
        this.detalleEvaluacionRepository = detalleEvaluacionRepository;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @Override
    public Evaluacion registrar(Evaluacion evaluacion) {
        if (evaluacion.getEstudiante() == null || evaluacion.getEstudiante().getId() == null) {
            throw new IllegalArgumentException("La evaluación requiere un estudiante con ID válido.");
        }
        if (evaluacion.getPeriodo() == null || evaluacion.getPeriodo().getId() == null) {
            throw new IllegalArgumentException("La evaluación requiere un periodo con ID válido.");
        }
        if (evaluacion.getUsuario() == null || evaluacion.getUsuario().getId() == null) {
            throw new IllegalArgumentException("La evaluación requiere un usuario con ID válido.");
        }
        if (evaluacion.getSeccion() == null) {
            throw new IllegalArgumentException("La evaluación requiere una sección.");
        }

        // Control de acceso: un docente solo puede registrar en sus secciones y la autoría
        // se fija al usuario autenticado (se ignora el usuarioId del body para evitar suplantación).
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        if (!contexto.esAdmin()) {
            contexto.verificarSeccion(evaluacion.getSeccion().getId());
            Usuario autor = new Usuario();
            autor.setId(contexto.usuarioId());
            evaluacion.setUsuario(autor);
        }

        // Validar unicidad: un docente no puede registrar dos evaluaciones al mismo estudiante en el mismo período
        List<Evaluacion> existentes = evaluacionRepository.findByEstudianteIdAndPeriodoId(
            evaluacion.getEstudiante().getId(),
            evaluacion.getPeriodo().getId()
        );
        boolean mismoDocente = existentes.stream()
            .anyMatch(e -> e.getUsuario().getId().equals(evaluacion.getUsuario().getId()));
        if (mismoDocente) {
            throw new IllegalArgumentException(
                "Ya existe una evaluación registrada por este docente para el estudiante en el periodo indicado."
            );
        }

        return evaluacionRepository.save(evaluacion);
    }

    @Override
    public DetalleEvaluacion agregarDetalle(Long evaluacionId, DetalleEvaluacion detalle) {
        Evaluacion evaluacion = buscarPorId(evaluacionId);
        detalle.setEvaluacion(evaluacion);
        return detalleEvaluacionRepository.save(detalle);
    }

    @Override
    @Transactional(readOnly = true)
    public Evaluacion buscarPorId(Long id) {
        Evaluacion evaluacion = evaluacionRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Evaluación no encontrada con id: " + id));
        // Control de acceso por sección (cubre también agregarDetalle, que pasa por aquí).
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contexto.verificarSeccion(evaluacion.getSeccion().getId());
        return evaluacion;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Evaluacion> listarPorEstudiante(Long estudianteId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contextoUsuarioService.verificarAccesoAlEstudiante(estudianteId, contexto);
        return evaluacionRepository.findByEstudianteId(estudianteId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Evaluacion> listarPorEstudianteYPeriodo(Long estudianteId, Long periodoId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contextoUsuarioService.verificarAccesoAlEstudiante(estudianteId, contexto);
        return evaluacionRepository.findByEstudianteIdAndPeriodoId(estudianteId, periodoId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Evaluacion> listarPorPeriodo(Long periodoId) {
        // Endpoint transversal a secciones: para un docente se filtra a sus secciones.
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        List<Evaluacion> evaluaciones = evaluacionRepository.findByPeriodoId(periodoId);
        if (contexto.esAdmin()) {
            return evaluaciones;
        }
        return evaluaciones.stream()
            .filter(e -> e.getSeccion() != null && contexto.tieneSeccion(e.getSeccion().getId()))
            .toList();
    }
}
