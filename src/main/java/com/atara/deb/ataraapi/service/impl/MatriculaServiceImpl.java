package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.Matricula;
import com.atara.deb.ataraapi.model.Seccion;
import com.atara.deb.ataraapi.model.enums.EstadoMatricula;
import com.atara.deb.ataraapi.repository.AnioLectivoRepository;
import com.atara.deb.ataraapi.repository.EstudianteRepository;
import com.atara.deb.ataraapi.repository.MatriculaRepository;
import com.atara.deb.ataraapi.repository.SeccionRepository;
import com.atara.deb.ataraapi.security.ContextoUsuario;
import com.atara.deb.ataraapi.security.ContextoUsuarioService;
import com.atara.deb.ataraapi.service.MatriculaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@Transactional
public class MatriculaServiceImpl implements MatriculaService {

    private final MatriculaRepository matriculaRepository;
    private final EstudianteRepository estudianteRepository;
    private final SeccionRepository seccionRepository;
    private final AnioLectivoRepository anioLectivoRepository;
    private final ContextoUsuarioService contextoUsuarioService;

    public MatriculaServiceImpl(
            MatriculaRepository matriculaRepository,
            EstudianteRepository estudianteRepository,
            SeccionRepository seccionRepository,
            AnioLectivoRepository anioLectivoRepository,
            ContextoUsuarioService contextoUsuarioService) {
        this.matriculaRepository = matriculaRepository;
        this.estudianteRepository = estudianteRepository;
        this.seccionRepository = seccionRepository;
        this.anioLectivoRepository = anioLectivoRepository;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @Override
    public Matricula matricular(Long estudianteId, Long seccionId, Long anioLectivoId) {
        // Control de acceso: un docente solo puede matricular en sus secciones (admin sin restricción).
        contextoUsuarioService.obtenerContextoActual().verificarSeccion(seccionId);

        Estudiante estudiante = estudianteRepository.findById(estudianteId)
            .orElseThrow(() -> new NoSuchElementException("Estudiante no encontrado con id: " + estudianteId));

        Seccion seccion = seccionRepository.findById(seccionId)
            .orElseThrow(() -> new NoSuchElementException("Sección no encontrada con id: " + seccionId));

        AnioLectivo anioLectivo = anioLectivoRepository.findById(anioLectivoId)
            .orElseThrow(() -> new NoSuchElementException("Año lectivo no encontrado con id: " + anioLectivoId));

        // Un estudiante puede pertenecer a varias secciones en el año (una por docente/materia),
        // pero no puede quedar matriculado dos veces en la MISMA sección.
        if (matriculaRepository.existsByEstudianteIdAndSeccionId(estudianteId, seccionId)) {
            throw new IllegalArgumentException(
                "El estudiante ya está matriculado en esta sección."
            );
        }

        // La sección debe pertenecer al mismo año lectivo
        if (!seccion.getAnioLectivo().getId().equals(anioLectivo.getId())) {
            throw new IllegalArgumentException(
                "La sección no pertenece al año lectivo indicado."
            );
        }

        Matricula matricula = Matricula.builder()
            .estudiante(estudiante)
            .seccion(seccion)
            .anioLectivo(anioLectivo)
            .estado(EstadoMatricula.ACTIVO)
            .fechaMatricula(LocalDate.now())
            .build();

        return matriculaRepository.save(matricula);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Matricula> listarPorEstudiante(Long estudianteId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contextoUsuarioService.verificarAccesoAlEstudiante(estudianteId, contexto);
        return matriculaRepository.findByEstudianteId(estudianteId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Matricula> listarPorSeccion(Long seccionId) {
        contextoUsuarioService.obtenerContextoActual().verificarSeccion(seccionId);
        return matriculaRepository.findBySeccionId(seccionId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Matricula> obtenerMatriculaEnAnio(Long estudianteId, Long anioLectivoId) {
        return matriculaRepository.findByEstudianteIdAndAnioLectivoId(estudianteId, anioLectivoId);
    }
}
