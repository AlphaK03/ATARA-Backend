package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoResponseDto;
import com.atara.deb.ataraapi.dto.catalogo.EstudianteCatalogoDto;
import com.atara.deb.ataraapi.dto.catalogo.NivelResponseDto;
import com.atara.deb.ataraapi.dto.seccion.SeccionRequestDto;
import com.atara.deb.ataraapi.dto.seccion.SeccionResponseDto;
import com.atara.deb.ataraapi.dto.usuario.UsuarioDocenteResponseDto;
import com.atara.deb.ataraapi.exception.AccesoDenegadoException;
import com.atara.deb.ataraapi.model.*;
import com.atara.deb.ataraapi.model.enums.EstadoEstudiante;
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

    /**
     * Devuelve el catálogo de estudiantes ACTIVOS que el wizard de sección
     * puede mostrar. Resuelve el bug donde un DOCENTE veía la lista vacía:
     * el endpoint usual /api/estudiantes filtra por las secciones del docente
     * (correcto para alertas/evaluaciones), pero al crear una sección nueva
     * todavía no hay matrículas con él y la búsqueda no encontraba a nadie.
     *
     * - Sin {@code anioLectivoId}: lista todos los activos.
     * - Con {@code anioLectivoId}: excluye los que ya tienen matrícula en ese año.
     * - Con {@code seccionId} además: re-incluye los matriculados en esa sección
     *   (caso edición — deben aparecer pre-seleccionados).
     */
    @Override
    public List<EstudianteCatalogoDto> listarEstudiantesDisponibles(Long anioLectivoId,
                                                                    Long seccionId) {
        // El acceso ya está restringido a ADMIN/DOCENTE en el controller.
        List<Estudiante> estudiantes;
        if (anioLectivoId == null) {
            estudiantes = estudianteRepository
                    .findByEstadoOrderByApellido1AscApellido2AscNombreAsc(EstadoEstudiante.ACTIVO);
        } else {
            // Si no se pasa seccionId pasamos -1 para que el OR del query no incluya nada extra
            // (no existe sección con id negativo, por lo que el segundo EXISTS siempre es falso).
            Long seccionIdExcluida = (seccionId != null) ? seccionId : -1L;
            estudiantes = estudianteRepository.findDisponiblesParaMatricula(
                    EstadoEstudiante.ACTIVO, anioLectivoId, seccionIdExcluida);
        }

        return estudiantes.stream()
                .map(e -> EstudianteCatalogoDto.builder()
                        .id(e.getId())
                        .identificacion(e.getIdentificacion())
                        .nombreCompleto(buildNombreCompleto(e))
                        .nombre(e.getNombre())
                        .apellido1(e.getApellido1())
                        .apellido2(e.getApellido2())
                        .fechaNacimiento(e.getFechaNacimiento())
                        .genero(e.getGenero() != null ? e.getGenero().name() : null)
                        .estado(e.getEstado() != null ? e.getEstado().name() : null)
                        .build())
                .toList();
    }

    private String buildNombreCompleto(Estudiante e) {
        StringBuilder sb = new StringBuilder();
        if (e.getNombre() != null) sb.append(e.getNombre());
        if (e.getApellido1() != null) sb.append(' ').append(e.getApellido1());
        if (e.getApellido2() != null) sb.append(' ').append(e.getApellido2());
        return sb.toString().trim();
    }

    @Override
    @Transactional
    public SeccionResponseDto actualizarSeccion(Long id, SeccionRequestDto dto) {
        Usuario actual = usuarioActual();
        String rol = actual.getRol().getNombre();
        boolean esAdmin   = ROL_ADMIN.equalsIgnoreCase(rol);
        boolean esDocente = ROL_DOCENTE.equalsIgnoreCase(rol);

        if (!esAdmin && !esDocente) {
            throw new AccesoDenegadoException(
                    "El rol " + rol + " no tiene permitido editar secciones.");
        }

        Seccion seccion = seccionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Sección no encontrada con id: " + id));

        // Si el editor es DOCENTE: debe ser el titular registrado.
        if (esDocente) {
            if (seccion.getDocente() == null
                    || !seccion.getDocente().getId().equals(actual.getId())) {
                throw new AccesoDenegadoException(
                        "Solo el docente titular puede editar esta sección.");
            }
        }

        Nivel nivel = nivelRepository.findById(dto.getNivelId())
                .orElseThrow(() -> new NoSuchElementException("Nivel no encontrado: " + dto.getNivelId()));
        CentroEducativo centro = centroRepository.findById(dto.getCentroId())
                .orElseThrow(() -> new NoSuchElementException("Centro educativo no encontrado: " + dto.getCentroId()));

        // Cambio de titular: solo ADMIN. El DOCENTE no puede reasignar.
        if (esAdmin) {
            Usuario titular = null;
            if (dto.getDocenteId() != null) {
                titular = usuarioRepository.findById(dto.getDocenteId())
                        .orElseThrow(() -> new NoSuchElementException(
                                "Docente no encontrado: " + dto.getDocenteId()));
            }
            seccion.setDocente(titular);
        }

        seccion.setNombre(dto.getNombre());
        seccion.setNivel(nivel);
        seccion.setCentro(centro);
        seccion.setCapacidad(dto.getCapacidad());

        Seccion guardada = seccionRepository.save(seccion);

        // ── Sincronizar co-docentes (solo si la lista viene en el DTO) ───────
        if (dto.getDocentesAdicionalesIds() != null) {
            sincronizarCoDocentes(guardada, dto.getDocentesAdicionalesIds(), actual, esDocente);
        }

        // ── Sincronizar matrículas de estudiantes (solo si la lista viene) ──
        if (dto.getEstudiantesIds() != null) {
            sincronizarEstudiantes(guardada, dto.getEstudiantesIds());
        }

        return toDto(guardada);
    }

    /**
     * Compara la lista de co-docentes deseada contra los que ya están en
     * usuarios_secciones para esta sección y aplica el delta:
     *   - Inserta los nuevos.
     *   - Borra los que ya no aparecen.
     * Si el creador es DOCENTE, su propia asignación se preserva siempre
     * (no permitimos que se quite a sí mismo por error).
     */
    private void sincronizarCoDocentes(Seccion seccion, List<Long> deseadosIds,
                                       Usuario actual, boolean esDocente) {
        Set<Long> deseados = new HashSet<>(deseadosIds);
        if (esDocente) {
            // El titular siempre permanece como co-docente registrado.
            deseados.add(actual.getId());
        }

        List<UsuarioSeccion> actuales = usuarioSeccionRepository.findBySeccionId(seccion.getId());
        Set<Long> actualesIds = actuales.stream()
                .map(us -> us.getUsuario().getId())
                .collect(java.util.stream.Collectors.toSet());

        // Insertar los nuevos
        for (Long id : deseados) {
            if (!actualesIds.contains(id)) {
                Usuario u = usuarioRepository.findById(id)
                        .orElseThrow(() -> new NoSuchElementException(
                                "Docente no encontrado: " + id));
                usuarioSeccionRepository.save(UsuarioSeccion.builder()
                        .usuario(u).seccion(seccion).build());
            }
        }
        // Borrar los que sobran
        for (UsuarioSeccion us : actuales) {
            if (!deseados.contains(us.getUsuario().getId())) {
                usuarioSeccionRepository.delete(us);
            }
        }
    }

    /**
     * Compara la lista deseada de estudiantes contra las matrículas ACTIVAS
     * actuales de la sección y aplica el delta:
     *   - Matricula a los nuevos (rechaza si ya tienen matrícula en otra sección del mismo año).
     *   - Elimina la matrícula de los que se quitan.
     * Las evaluaciones quedan intactas (están ligadas a estudiante+periodo, no a matrícula).
     */
    private void sincronizarEstudiantes(Seccion seccion, List<Long> deseadosIds) {
        Set<Long> deseados = new HashSet<>(deseadosIds);
        AnioLectivo anioLectivo = seccion.getAnioLectivo();

        List<Matricula> actuales = matriculaRepository
                .findBySeccionIdAndEstado(seccion.getId(), EstadoMatricula.ACTIVO);
        Set<Long> actualesIds = actuales.stream()
                .map(m -> m.getEstudiante().getId())
                .collect(java.util.stream.Collectors.toSet());

        // Matricular nuevos
        for (Long estudianteId : deseados) {
            if (actualesIds.contains(estudianteId)) continue;

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

            Matricula nueva = Matricula.builder()
                    .estudiante(estudiante)
                    .seccion(seccion)
                    .anioLectivo(anioLectivo)
                    .estado(EstadoMatricula.ACTIVO)
                    .fechaMatricula(LocalDate.now())
                    .build();
            matriculaRepository.save(nueva);
        }

        // Quitar los que ya no se desean
        for (Matricula m : actuales) {
            if (!deseados.contains(m.getEstudiante().getId())) {
                matriculaRepository.delete(m);
            }
        }
    }

    @Override
    @Transactional
    public void eliminarComoDocente(Long id) {
        Usuario actual = usuarioActual();
        if (!ROL_DOCENTE.equalsIgnoreCase(actual.getRol().getNombre())) {
            throw new AccesoDenegadoException(
                    "Solo el rol DOCENTE puede usar este flujo de eliminación.");
        }

        Seccion seccion = seccionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Sección no encontrada con id: " + id));

        // Solo el docente titular puede eliminar.
        if (seccion.getDocente() == null
                || !seccion.getDocente().getId().equals(actual.getId())) {
            throw new AccesoDenegadoException(
                    "No es titular de esta sección — no puede eliminarla.");
        }

        // Para preservar el histórico, no se borra si tiene datos asociados.
        if (matriculaRepository.existsBySeccionId(id)
                || evaluacionRepository.existsBySeccionId(id)
                || evaluacionSaberRepository.existsBySeccionId(id)) {
            throw new IllegalArgumentException(
                    "La sección tiene matrículas o evaluaciones asociadas y no puede eliminarse. "
                            + "Solo un administrador puede borrarla con su historial completo.");
        }

        // Limpia las asignaciones M:N (no son histórico) y borra la sección.
        usuarioSeccionRepository.deleteAllBySeccionId(id);
        seccionRepository.deleteById(id);
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
                .nivelId(s.getNivel().getId())
                .nivelNombre(s.getNivel().getNombre())
                .nivelGrado(s.getNivel().getNumeroGrado())
                .centroId(s.getCentro().getId())
                .centroNombre(s.getCentro().getNombre())
                .docenteId(docente != null ? docente.getId() : null)
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
