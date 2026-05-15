package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.enums.EstadoEstudiante;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.security.ContextoUsuario;
import com.atara.deb.ataraapi.security.ContextoUsuarioService;
import com.atara.deb.ataraapi.service.EstudianteService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@Transactional
public class EstudianteServiceImpl implements EstudianteService {

    private final EstudianteRepository estudianteRepository;
    private final MatriculaRepository matriculaRepository;
    private final EvaluacionRepository evaluacionRepository;
    private final EvaluacionSaberRepository evaluacionSaberRepository;
    private final AlertaRepository alertaRepository;
    private final AlertaTematicaRepository alertaTematicaRepository;
    private final ContextoUsuarioService contextoUsuarioService;

    public EstudianteServiceImpl(EstudianteRepository estudianteRepository,
                                 MatriculaRepository matriculaRepository,
                                 EvaluacionRepository evaluacionRepository,
                                 EvaluacionSaberRepository evaluacionSaberRepository,
                                 AlertaRepository alertaRepository,
                                 AlertaTematicaRepository alertaTematicaRepository,
                                 ContextoUsuarioService contextoUsuarioService) {
        this.estudianteRepository = estudianteRepository;
        this.matriculaRepository = matriculaRepository;
        this.evaluacionRepository = evaluacionRepository;
        this.evaluacionSaberRepository = evaluacionSaberRepository;
        this.alertaRepository = alertaRepository;
        this.alertaTematicaRepository = alertaTematicaRepository;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @Override
    public Estudiante registrar(Estudiante estudiante) {
        if (estudianteRepository.existsByIdentificacion(estudiante.getIdentificacion())) {
            throw new IllegalArgumentException(
                "Ya existe un estudiante con identificación: " + estudiante.getIdentificacion()
            );
        }
        if (estudiante.getEstado() == null) {
            estudiante.setEstado(EstadoEstudiante.ACTIVO);
        }
        return estudianteRepository.save(estudiante);
    }

    @Override
    @Transactional(readOnly = true)
    public Estudiante buscarPorId(Long id) {
        Estudiante estudiante = estudianteRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Estudiante no encontrado con id: " + id));

        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contextoUsuarioService.verificarAccesoAlEstudiante(id, contexto);

        return estudiante;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Estudiante> buscarPorIdentificacion(String identificacion) {
        return estudianteRepository.findByIdentificacion(identificacion);
    }

    /**
     * Lista global de estudiantes para los catálogos del frontend (wizard de
     * sección, búsqueda de estudiantes para matricular, etc).
     *
     * <p>Se eliminó el filtro previo "solo estudiantes de mis secciones" para
     * el rol DOCENTE porque rompía el caso de uso del wizard: un docente que
     * crea su primera sección, o que quiere matricular alumnos huérfanos (sin
     * sección), no veía a nadie y la búsqueda llegaba vacía.
     *
     * <p>El control de acceso fino se preserva en {@link #buscarPorId(Long)},
     * que sigue invocando {@code verificarAccesoAlEstudiante} — un docente no
     * puede abrir el detalle ni editar a un estudiante fuera de su alcance,
     * pero sí puede verlo en el catálogo para matricularlo.
     */
    @Override
    @Transactional(readOnly = true)
    public List<Estudiante> listarTodos() {
        // Antes filtraba por contexto.seccionIds() para DOCENTE; ahora devuelve todos.
        return estudianteRepository.findAll();
    }

    /**
     * Igual que {@link #listarTodos()}: se relaja el filtro por sección para
     * que el catálogo del wizard funcione cuando el frontend pasa
     * {@code ?estado=ACTIVO}.
     */
    @Override
    @Transactional(readOnly = true)
    public List<Estudiante> listarPorEstado(EstadoEstudiante estado) {
        return estudianteRepository.findByEstado(estado);
    }

    @Override
    public Estudiante actualizar(Long id, Estudiante datosActualizados) {
        Estudiante existente = buscarPorId(id); // ya valida acceso

        if (!existente.getIdentificacion().equals(datosActualizados.getIdentificacion())
                && estudianteRepository.existsByIdentificacion(datosActualizados.getIdentificacion())) {
            throw new IllegalArgumentException(
                "Ya existe un estudiante con identificación: " + datosActualizados.getIdentificacion()
            );
        }

        existente.setIdentificacion(datosActualizados.getIdentificacion());
        existente.setNombre(datosActualizados.getNombre());
        existente.setApellido1(datosActualizados.getApellido1());
        existente.setApellido2(datosActualizados.getApellido2());
        existente.setFechaNacimiento(datosActualizados.getFechaNacimiento());
        existente.setGenero(datosActualizados.getGenero());
        existente.setNombreAcudiente(datosActualizados.getNombreAcudiente());
        existente.setTelefonoAcudiente(datosActualizados.getTelefonoAcudiente());
        existente.setCorreoAcudiente(datosActualizados.getCorreoAcudiente());
        if (datosActualizados.getEstado() != null) {
            existente.setEstado(datosActualizados.getEstado());
        }

        return estudianteRepository.save(existente);
    }

    @Override
    public void eliminar(Long id) {
        buscarPorId(id); // lanza NoSuchElementException si no existe; valida acceso
        // Eliminar en orden correcto respetando FK RESTRICT del esquema:
        // alertas temáticas → alertas → evaluaciones saber → evaluaciones → matrículas → estudiante
        alertaTematicaRepository.deleteAllByEstudianteId(id);
        alertaRepository.deleteAllByEstudianteId(id);
        evaluacionSaberRepository.deleteAllByEstudianteId(id);
        evaluacionRepository.deleteAllByEstudianteId(id);
        matriculaRepository.deleteAllByEstudianteId(id);
        estudianteRepository.deleteById(id);
    }
}
