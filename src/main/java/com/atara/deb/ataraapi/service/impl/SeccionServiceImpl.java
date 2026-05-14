package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoResponseDto;
import com.atara.deb.ataraapi.dto.catalogo.NivelResponseDto;
import com.atara.deb.ataraapi.dto.seccion.SeccionRequestDto;
import com.atara.deb.ataraapi.dto.seccion.SeccionResponseDto;
import com.atara.deb.ataraapi.dto.usuario.UsuarioDocenteResponseDto;
import com.atara.deb.ataraapi.exception.AccesoDenegadoException;
import com.atara.deb.ataraapi.model.*;
import com.atara.deb.ataraapi.model.enums.EstadoMatricula;
import com.atara.deb.ataraapi.model.enums.EstadoUsuario;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.security.UsuarioPrincipal;
import com.atara.deb.ataraapi.service.SeccionService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class SeccionServiceImpl implements SeccionService {

    private static final String ROL_ADMIN = "ADMIN";
    private static final String ROL_DOCENTE = "DOCENTE";

    private final SeccionRepository seccionRepository;
    private final NivelRepository nivelRepository;
    private final CentroEducativoRepository centroRepository;
    private final AnioLectivoRepository anioLectivoRepository;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioSeccionRepository usuarioSeccionRepository;
    private final EstudianteRepository estudianteRepository;
    private final MatriculaRepository matriculaRepository;
    private final EvaluacionRepository evaluacionRepository;
    private final EvaluacionSaberRepository evaluacionSaberRepository;

    public SeccionServiceImpl(SeccionRepository seccionRepository,
                              NivelRepository nivelRepository,
                              CentroEducativoRepository centroRepository,
                              AnioLectivoRepository anioLectivoRepository,
                              UsuarioRepository usuarioRepository,
                              UsuarioSeccionRepository usuarioSeccionRepository,
                              EstudianteRepository estudianteRepository,
                              MatriculaRepository matriculaRepository,
                              EvaluacionRepository evaluacionRepository,
                              EvaluacionSaberRepository evaluacionSaberRepository) {
        this.seccionRepository = seccionRepository;
        this.nivelRepository = nivelRepository;
        this.centroRepository = centroRepository;
        this.anioLectivoRepository = anioLectivoRepository;
        this.usuarioRepository = usuarioRepository;
        this.usuarioSeccionRepository = usuarioSeccionRepository;
        this.estudianteRepository = estudianteRepository;
        this.matriculaRepository = matriculaRepository;
        this.evaluacionRepository = evaluacionRepository;
        this.evaluacionSaberRepository = evaluacionSaberRepository;
    }

    /**
     * Devuelve las secciones del año lectivo visibles para el usuario autenticado:
     *  - ADMIN: todas las secciones del año.
     *  - DOCENTE: solo donde es titular o está asignado vía usuarios_secciones.
     *  - Otros roles: 403 (AccesoDenegadoException).
     */
    @Override
    public List<SeccionResponseDto> listarPorAnioLectivo(Long anioLectivoId) {
        Usuario actual = usuarioActual();
        String rol = actual.getRol().getNombre();

        List<Seccion> secciones;
        if (ROL_ADMIN.equalsIgnoreCase(rol)) {
            secciones = seccionRepository.findByAnioLectivoId(anioLectivoId);
        } else if (ROL_DOCENTE.equalsIgnoreCase(rol)) {
            secciones = seccionRepository
                    .findByAnioLectivoIdAndAccesibleParaUsuario(anioLectivoId, actual.getId());
        } else {
            throw new AccesoDenegadoException(
                    "El rol " + rol + " no tiene permitido listar secciones.");
        }

        return secciones.stream()
                .sorted((a, b) -> {
                    int cmp = a.getNivel().getNumeroGrado().compareTo(b.getNivel().getNumeroGrado());
                    return cmp != 0 ? cmp : a.getNombre().compareTo(b.getNombre());
                })
                .map(this::toDto)
                .toList();
    }

    @Override
    public List<SeccionResponseDto> listarPorDocente(Long docenteId) {
        return seccionRepository.findByDocenteId(docenteId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public SeccionResponseDto buscarPorId(Long id) {
        Seccion seccion = seccionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Sección no encontrada con id: " + id));
        return toDto(seccion);
    }

    @Override
    @Transactional
    public SeccionResponseDto crearSeccion(SeccionRequestDto dto) {
        Usuario actual = usuarioActual();
        String rol = actual.getRol().getNombre();

        if (!ROL_ADMIN.equalsIgnoreCase(rol) && !ROL_DOCENTE.equalsIgnoreCase(rol)) {
            throw new AccesoDenegadoException(
                    "El rol " + rol + " no tiene permitido crear secciones.");
        }

        Nivel nivel = nivelRepository.findById(dto.getNivelId())
                .orElseThrow(() -> new NoSuchElementException("Nivel no encontrado: " + dto.getNivelId()));
        CentroEducativo centro = centroRepository.findById(dto.getCentroId())
                .orElseThrow(() -> new NoSuchElementException("Centro educativo no encontrado: " + dto.getCentroId()));
        AnioLectivo anioLectivo = anioLectivoRepository.findById(dto.getAnioLectivoId())
                .orElseThrow(() -> new NoSuchElementException("Año lectivo no encontrado: " + dto.getAnioLectivoId()));

        // El titular depende del rol del creador:
        //  - DOCENTE: él queda automáticamente como titular (no puede asignar a otro).
        //  - ADMIN: usa el docenteId del DTO si viene, o queda sin titular.
        Usuario titular;
        if (ROL_DOCENTE.equalsIgnoreCase(rol)) {
            titular = actual;
        } else {
            titular = null;
            if (dto.getDocenteId() != null) {
                titular = usuarioRepository.findById(dto.getDocenteId())
                        .orElseThrow(() -> new NoSuchElementException(
                                "Docente no encontrado: " + dto.getDocenteId()));
            }
        }

        Seccion seccion = Seccion.builder()
                .nombre(dto.getNombre())
                .nivel(nivel)
                .centro(centro)
                .anioLectivo(anioLectivo)
                .docente(titular)
                .capacidad(dto.getCapacidad())
                .build();

        Seccion guardada = seccionRepository.save(seccion);

        // Asignar co-docentes vía usuarios_secciones.
        // El docente creador se autoincluye (titular + asignación explícita)
        // y se suman los docentesAdicionalesIds que vengan en el DTO.
        Set<Long> docentesAsignar = new HashSet<>();
        if (ROL_DOCENTE.equalsIgnoreCase(rol)) {
            docentesAsignar.add(actual.getId());
        }
        if (dto.getDocentesAdicionalesIds() != null) {
            docentesAsignar.addAll(dto.getDocentesAdicionalesIds());
        }
        for (Long docenteId : docentesAsignar) {
            Usuario u = usuarioRepository.findById(docenteId)
                    .orElseThrow(() -> new NoSuchElementException(
                            "Docente no encontrado: " + docenteId));
            UsuarioSeccion us = UsuarioSeccion.builder()
                    .usuario(u)
                    .seccion(guardada)
                    .build();
            usuarioSeccionRepository.save(us);
        }

        // Matricular estudiantes solicitados (si vienen en el DTO).
        if (dto.getEstudiantesIds() != null) {
            for (Long estudianteId : dto.getEstudiantesIds()) {
                Estudiante estudiante = estudianteRepository.findById(estudianteId)
                        .orElseThrow(() -> new NoSuchElementException(
                                "Estudiante no encontrado: " + estudianteId));

                if (matriculaRepository.existsByEstudianteIdAndAnioLectivoId(
                        estudianteId, anioLectivo.getId())) {
                    throw new IllegalArgumentException(
                            "El estudiante con id " + estudianteId
                                    + " ya tiene una matrícula registrada para el año lectivo "
                                    + anioLectivo.getAnio() + ".");
                }

                Matricula matricula = Matricula.builder()
                        .estudiante(estudiante)
                        .seccion(guardada)
                        .anioLectivo(anioLectivo)
                        .estado(EstadoMatricula.ACTIVO)
                        .fechaMatricula(LocalDate.now())
                        .build();
                matriculaRepository.save(matricula);
            }
        }

        return toDto(guardada);
    }

    @Override
    public List<NivelResponseDto> listarNiveles() {
        return nivelRepository.findAll()
                .stream()
                .sorted((a, b) -> a.getNumeroGrado().compareTo(b.getNumeroGrado()))
                .map(n -> NivelResponseDto.builder()
                        .id(n.getId())
                        .numeroGrado(n.getNumeroGrado())
                        .nombre(n.getNombre())
                        .build())
                .toList();
    }

    @Override
    public List<CentroEducativoResponseDto> listarCentros() {
        return centroRepository.findAll()
                .stream()
                .sorted((a, b) -> a.getNombre().compareTo(b.getNombre()))
                .map(c -> CentroEducativoResponseDto.builder()
                        .id(c.getId())
                        .nombre(c.getNombre())
                        .circuito(c.getCircuito())
                        .direccionRegional(c.getDireccionRegional())
                        .telefono(c.getTelefono())
                        .correo(c.getCorreo())
                        .build())
                .toList();
    }

    @Override
    public List<UsuarioDocenteResponseDto> listarDocentes() {
        return usuarioRepository.findByEstado(EstadoUsuario.ACTIVO)
                .stream()
                .filter(u -> "DOCENTE".equalsIgnoreCase(u.getRol().getNombre()))
                .sorted((a, b) -> a.getApellidos().compareTo(b.getApellidos()))
                .map(u -> UsuarioDocenteResponseDto.builder()
                        .id(u.getId())
                        .nombreCompleto(u.getNombre() + " " + u.getApellidos())
                        .correo(u.getCorreo())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public SeccionResponseDto actualizarSeccion(Long id, SeccionRequestDto dto) {
        Seccion seccion = seccionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Sección no encontrada con id: " + id));
        Nivel nivel = nivelRepository.findById(dto.getNivelId())
                .orElseThrow(() -> new NoSuchElementException("Nivel no encontrado: " + dto.getNivelId()));
        CentroEducativo centro = centroRepository.findById(dto.getCentroId())
                .orElseThrow(() -> new NoSuchElementException("Centro educativo no encontrado: " + dto.getCentroId()));

        Usuario docente = null;
        if (dto.getDocenteId() != null) {
            docente = usuarioRepository.findById(dto.getDocenteId())
                    .orElseThrow(() -> new NoSuchElementException("Docente no encontrado: " + dto.getDocenteId()));
        }

        seccion.setNombre(dto.getNombre());
        seccion.setNivel(nivel);
        seccion.setCentro(centro);
        seccion.setDocente(docente);
        seccion.setCapacidad(dto.getCapacidad());

        return toDto(seccionRepository.save(seccion));
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        if (!seccionRepository.existsById(id)) {
            throw new NoSuchElementException("Sección no encontrada con id: " + id);
        }
        // Orden: evaluaciones saber → evaluaciones → matrículas → asignaciones → sección
        // (FK RESTRICT en evaluaciones.seccion_id, evaluaciones_saber.seccion_id, matriculas.seccion_id)
        evaluacionSaberRepository.deleteAllBySeccionId(id);  // cascada a detalle_evaluacion_saber
        evaluacionRepository.deleteAllBySeccionId(id);       // cascada a detalle_evaluacion
        matriculaRepository.deleteAllBySeccionId(id);
        usuarioSeccionRepository.deleteAllBySeccionId(id);
        seccionRepository.deleteById(id);
    }

    private SeccionResponseDto toDto(Seccion s) {
        Usuario docente = s.getDocente();
        String docenteNombre = docente != null
                ? docente.getNombre() + " " + docente.getApellidos()
                : null;

        return SeccionResponseDto.builder()
                .id(s.getId())
                .nombre(s.getNombre())
                .anioLectivoId(s.getAnioLectivo().getId())
                .anioLectivoAnio(s.getAnioLectivo().getAnio())
                .nivelNombre(s.getNivel().getNombre())
                .nivelGrado(s.getNivel().getNumeroGrado())
                .centroNombre(s.getCentro().getNombre())
                .docenteNombreCompleto(docenteNombre)
                .capacidad(s.getCapacidad())
                .totalEstudiantes(matriculaRepository.countBySeccionIdAndEstado(s.getId(), EstadoMatricula.ACTIVO))
                .build();
    }

    /**
     * Obtiene el usuario actualmente autenticado desde el SecurityContext.
     * Lanza AccesoDenegadoException si no hay autenticación válida.
     */
    private Usuario usuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UsuarioPrincipal principal)) {
            throw new AccesoDenegadoException("No hay un usuario autenticado en el contexto.");
        }
        return principal.getUsuario();
    }
}
