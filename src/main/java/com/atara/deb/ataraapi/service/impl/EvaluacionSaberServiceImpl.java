package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.saber.*;
import com.atara.deb.ataraapi.model.*;
import com.atara.deb.ataraapi.model.enums.NivelAlertaTematica;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.security.ContextoUsuario;
import com.atara.deb.ataraapi.security.ContextoUsuarioService;
import com.atara.deb.ataraapi.service.EvaluacionSaberService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class EvaluacionSaberServiceImpl implements EvaluacionSaberService {

    private final EvaluacionSaberRepository evaluacionSaberRepository;
    private final DetalleEvaluacionSaberRepository detalleRepository;
    private final EstudianteRepository estudianteRepository;
    private final PeriodoRepository periodoRepository;
    private final UsuarioRepository usuarioRepository;
    private final SeccionRepository seccionRepository;
    private final TipoSaberRepository tipoSaberRepository;
    private final EjeTemaaticoRepository ejeTemaaticoRepository;
    private final MatriculaRepository matriculaRepository;
    private final MateriaRepository materiaRepository;
    private final ContextoUsuarioService contextoUsuarioService;

    public EvaluacionSaberServiceImpl(
            EvaluacionSaberRepository evaluacionSaberRepository,
            DetalleEvaluacionSaberRepository detalleRepository,
            EstudianteRepository estudianteRepository,
            PeriodoRepository periodoRepository,
            UsuarioRepository usuarioRepository,
            SeccionRepository seccionRepository,
            TipoSaberRepository tipoSaberRepository,
            EjeTemaaticoRepository ejeTemaaticoRepository,
            MatriculaRepository matriculaRepository,
            MateriaRepository materiaRepository,
            ContextoUsuarioService contextoUsuarioService) {
        this.evaluacionSaberRepository = evaluacionSaberRepository;
        this.detalleRepository = detalleRepository;
        this.estudianteRepository = estudianteRepository;
        this.periodoRepository = periodoRepository;
        this.usuarioRepository = usuarioRepository;
        this.seccionRepository = seccionRepository;
        this.tipoSaberRepository = tipoSaberRepository;
        this.ejeTemaaticoRepository = ejeTemaaticoRepository;
        this.matriculaRepository = matriculaRepository;
        this.materiaRepository = materiaRepository;
        this.contextoUsuarioService = contextoUsuarioService;
    }

    @Override
    @Transactional
    public EvaluacionSaberResponseDto registrar(EvaluacionSaberRequestDto request) {
        Estudiante estudiante = estudianteRepository.findById(request.getEstudianteId())
            .orElseThrow(() -> new NoSuchElementException("Estudiante no encontrado con ID: " + request.getEstudianteId()));
        Periodo periodo = periodoRepository.findById(request.getPeriodoId())
            .orElseThrow(() -> new NoSuchElementException("Periodo no encontrado con ID: " + request.getPeriodoId()));
        Usuario usuario = usuarioRepository.findById(request.getUsuarioId())
            .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con ID: " + request.getUsuarioId()));
        Seccion seccion = seccionRepository.findById(request.getSeccionId())
            .orElseThrow(() -> new NoSuchElementException("Sección no encontrada con ID: " + request.getSeccionId()));
        TipoSaber tipoSaber = tipoSaberRepository.findById(request.getTipoSaberId())
            .orElseThrow(() -> new NoSuchElementException("Tipo de saber no encontrado con ID: " + request.getTipoSaberId()));
        Materia materia = materiaRepository.findById(request.getMateriaId())
            .orElseThrow(() -> new NoSuchElementException("Materia no encontrada con ID: " + request.getMateriaId()));

        // Validar que el usuario autenticado tiene acceso a esta sección y materia
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contexto.verificarSeccion(seccion.getId());
        contexto.verificarMateria(materia.getId());

        // Usar siempre el usuario autenticado como autor de la evaluación
        usuario = usuarioRepository.findById(contexto.usuarioId())
            .orElseThrow(() -> new NoSuchElementException("Usuario autenticado no encontrado."));

        List<EjeTematico> ejesDelTipo = ejeTemaaticoRepository
            .findByMateriaIdAndTipoSaberIdOrderByOrden(materia.getId(), tipoSaber.getId());
        Set<Integer> ejesValidosIds = ejesDelTipo.stream().map(EjeTematico::getId).collect(Collectors.toSet());

        for (DetalleEvaluacionSaberRequestDto det : request.getDetalles()) {
            if (!ejesValidosIds.contains(det.getEjeTemaaticoId())) {
                throw new IllegalArgumentException(
                    "El eje temático ID " + det.getEjeTemaaticoId()
                    + " no pertenece a la materia '" + materia.getNombre()
                    + "' / tipo de saber '" + tipoSaber.getNombre() + "'");
            }
        }

        EvaluacionSaber evaluacion = EvaluacionSaber.builder()
            .estudiante(estudiante)
            .periodo(periodo)
            .usuario(usuario)
            .seccion(seccion)
            .materia(materia)
            .tipoSaber(tipoSaber)
            .fechaEvaluacion(request.getFechaEvaluacion() != null ? request.getFechaEvaluacion() : LocalDate.now())
            .observacion(request.getObservacion())
            .build();

        Map<Integer, EjeTematico> ejesMap = ejesDelTipo.stream()
            .collect(Collectors.toMap(EjeTematico::getId, e -> e));

        for (DetalleEvaluacionSaberRequestDto detReq : request.getDetalles()) {
            DetalleEvaluacionSaber detalle = DetalleEvaluacionSaber.builder()
                .evaluacionSaber(evaluacion)
                .ejeTematico(ejesMap.get(detReq.getEjeTemaaticoId()))
                .valor(detReq.getValor())
                .observacion(detReq.getObservacion())
                .build();
            evaluacion.getDetalles().add(detalle);
        }

        EvaluacionSaber saved = evaluacionSaberRepository.save(evaluacion);
        return toResponseDto(saved);
    }

    @Override
    @Transactional
    public EvaluacionSaberResponseDto actualizar(Long id, EvaluacionSaberRequestDto request) {
        EvaluacionSaber eval = evaluacionSaberRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Evaluación por saber no encontrada con ID: " + id));

        // Validar que el usuario autenticado tiene acceso a la sección de esta evaluación
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contexto.verificarSeccion(eval.getSeccion().getId());
        contexto.verificarMateria(eval.getMateria().getId());

        List<EjeTematico> ejesDelTipo = ejeTemaaticoRepository
            .findByMateriaIdAndTipoSaberIdOrderByOrden(
                eval.getMateria().getId(), eval.getTipoSaber().getId());
        Set<Integer> ejesValidosIds = ejesDelTipo.stream().map(EjeTematico::getId).collect(Collectors.toSet());

        for (DetalleEvaluacionSaberRequestDto det : request.getDetalles()) {
            if (!ejesValidosIds.contains(det.getEjeTemaaticoId())) {
                throw new IllegalArgumentException(
                    "El eje temático ID " + det.getEjeTemaaticoId()
                    + " no pertenece a la materia '" + eval.getMateria().getNombre()
                    + "' / tipo de saber '" + eval.getTipoSaber().getNombre() + "'");
            }
        }

        if (request.getFechaEvaluacion() != null) eval.setFechaEvaluacion(request.getFechaEvaluacion());
        eval.setObservacion(request.getObservacion());

        // Reemplazar detalles — orphanRemoval elimina los anteriores
        Map<Integer, EjeTematico> ejesMap = ejesDelTipo.stream()
            .collect(Collectors.toMap(EjeTematico::getId, e -> e));

        eval.getDetalles().clear();
        evaluacionSaberRepository.saveAndFlush(eval);   // fuerza el DELETE antes del INSERT

        for (DetalleEvaluacionSaberRequestDto detReq : request.getDetalles()) {
            eval.getDetalles().add(DetalleEvaluacionSaber.builder()
                .evaluacionSaber(eval)
                .ejeTematico(ejesMap.get(detReq.getEjeTemaaticoId()))
                .valor(detReq.getValor())
                .observacion(detReq.getObservacion())
                .build());
        }

        return toResponseDto(evaluacionSaberRepository.save(eval));
    }

    @Override
    public EvaluacionSaberResponseDto buscarPorId(Long id) {
        EvaluacionSaber eval = evaluacionSaberRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Evaluación por saber no encontrada con ID: " + id));
        // Control de acceso: solo secciones del docente (admin sin restricción).
        contextoUsuarioService.obtenerContextoActual().verificarSeccion(eval.getSeccion().getId());
        return toResponseDto(eval);
    }

    @Override
    public List<EvaluacionSaberResponseDto> listarPorEstudianteYPeriodo(Long estudianteId, Long periodoId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contextoUsuarioService.verificarAccesoAlEstudiante(estudianteId, contexto);
        return evaluacionSaberRepository.findByEstudianteIdAndPeriodoId(estudianteId, periodoId)
            .stream().map(this::toResponseDto).toList();
    }

    @Override
    public List<EvaluacionSaberResponseDto> listarPorSeccionYPeriodo(Long seccionId, Long periodoId) {
        contextoUsuarioService.obtenerContextoActual().verificarSeccion(seccionId);
        return evaluacionSaberRepository.findBySeccionIdAndPeriodoId(seccionId, periodoId)
            .stream().map(this::toResponseDto).toList();
    }

    @Override
    public ResumenPromediosEstudianteDto obtenerPromedios(Long estudianteId, Long periodoId) {
        ContextoUsuario contexto = contextoUsuarioService.obtenerContextoActual();
        contextoUsuarioService.verificarAccesoAlEstudiante(estudianteId, contexto);

        Estudiante estudiante = estudianteRepository.findById(estudianteId)
            .orElseThrow(() -> new NoSuchElementException("Estudiante no encontrado con ID: " + estudianteId));
        Periodo periodo = periodoRepository.findById(periodoId)
            .orElseThrow(() -> new NoSuchElementException("Periodo no encontrado con ID: " + periodoId));

        // Endpoint a nivel de estudiante (sin sección): para un DOCENTE se acota a SUS
        // secciones, de modo que nunca agrega evaluaciones hechas por otro docente sobre
        // el mismo estudiante (Bug 2). ADMIN/COORDINADOR conservan visión global.
        List<DetalleEvaluacionSaber> detalles = contexto.esAdmin()
            ? detalleRepository.findByEstudianteAndPeriodo(estudianteId, periodoId)
            : detalleRepository.findByEstudiantePeriodoYSecciones(
                estudianteId, periodoId, contexto.seccionIds());

        return construirResumenPromedios(estudiante, periodo, detalles);
    }

    @Override
    public List<ResumenPromediosEstudianteDto> obtenerPromediosSeccion(Long seccionId, Long periodoId) {
        contextoUsuarioService.obtenerContextoActual().verificarSeccion(seccionId);

        Periodo periodo = periodoRepository.findById(periodoId)
            .orElseThrow(() -> new NoSuchElementException("Periodo no encontrado con ID: " + periodoId));

        List<Long> estudianteIds = matriculaRepository.findBySeccionId(seccionId).stream()
            .map(m -> m.getEstudiante().getId())
            .distinct()
            .toList();

        List<ResumenPromediosEstudianteDto> resumenes = new ArrayList<>();
        for (Long estId : estudianteIds) {
            Estudiante est = estudianteRepository.findById(estId).orElse(null);
            if (est == null) continue;
            // ACOTADO por sección: solo las evaluaciones de esta sección cuentan para el
            // resumen, evitando que se "cuelen" las de otra sección/docente (Bug 2).
            List<DetalleEvaluacionSaber> detalles =
                detalleRepository.findByEstudiantePeriodoYSeccion(estId, periodoId, seccionId);
            if (!detalles.isEmpty()) {
                resumenes.add(construirResumenPromedios(est, periodo, detalles));
            }
        }
        return resumenes;
    }

    private ResumenPromediosEstudianteDto construirResumenPromedios(
            Estudiante estudiante, Periodo periodo, List<DetalleEvaluacionSaber> detalles) {

        // Agrupar detalles por eje temático
        Map<Integer, List<DetalleEvaluacionSaber>> porEje = detalles.stream()
            .collect(Collectors.groupingBy(d -> d.getEjeTematico().getId()));

        // Calcular promedio por eje (incluye materia del eje)
        Map<Integer, PromedioEjeResponseDto> promediosEje = new LinkedHashMap<>();
        for (Map.Entry<Integer, List<DetalleEvaluacionSaber>> entry : porEje.entrySet()) {
            List<DetalleEvaluacionSaber> detsEje = entry.getValue();
            EjeTematico eje = detsEje.get(0).getEjeTematico();

            BigDecimal sum = BigDecimal.ZERO;
            short min = 5, max = 1;
            for (DetalleEvaluacionSaber d : detsEje) {
                sum = sum.add(BigDecimal.valueOf(d.getValor()));
                if (d.getValor() < min) min = d.getValor();
                if (d.getValor() > max) max = d.getValor();
            }
            BigDecimal promedio = sum.divide(BigDecimal.valueOf(detsEje.size()), 2, RoundingMode.HALF_UP);
            String nivelAlerta = calcularNivelAlerta(promedio);

            promediosEje.put(entry.getKey(), PromedioEjeResponseDto.builder()
                .ejeTemaaticoId(eje.getId())
                .ejeNombre(eje.getNombre())
                .ejeClave(eje.getClave())
                .materiaId(eje.getMateria().getId())
                .materiaNombre(eje.getMateria().getNombre())
                .tipoSaberId(eje.getTipoSaber().getId())
                .tipoSaberNombre(eje.getTipoSaber().getNombre())
                .promedio(promedio)
                .totalEvaluaciones(detsEje.size())
                .valorMinimo(min)
                .valorMaximo(max)
                .nivelAlerta(nivelAlerta)
                .build());
        }

        // Agrupar promedios por (materiaId, tipoSaberId) para mantener independencia por materia
        Map<String, List<PromedioEjeResponseDto>> porMateriaYTipo = promediosEje.values().stream()
            .collect(Collectors.groupingBy(
                p -> p.getMateriaId() + "_" + p.getTipoSaberId(),
                LinkedHashMap::new,
                Collectors.toList()));

        List<PromedioTipoSaberResponseDto> promediosTipo = new ArrayList<>();
        BigDecimal sumaGlobal = BigDecimal.ZERO;
        int countGlobal = 0;

        for (Map.Entry<String, List<PromedioEjeResponseDto>> entry : porMateriaYTipo.entrySet()) {
            List<PromedioEjeResponseDto> ejes = entry.getValue();
            BigDecimal sumaTipo = ejes.stream()
                .map(PromedioEjeResponseDto::getPromedio)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal promedioTipo = sumaTipo.divide(BigDecimal.valueOf(ejes.size()), 2, RoundingMode.HALF_UP);

            sumaGlobal = sumaGlobal.add(sumaTipo);
            countGlobal += ejes.size();

            promediosTipo.add(PromedioTipoSaberResponseDto.builder()
                .materiaId(ejes.get(0).getMateriaId())
                .materiaNombre(ejes.get(0).getMateriaNombre())
                .tipoSaberId(ejes.get(0).getTipoSaberId())
                .tipoSaberNombre(ejes.get(0).getTipoSaberNombre())
                .promedioGeneral(promedioTipo)
                .ejesEvaluados(ejes.size())
                .promediosPorEje(ejes)
                .build());
        }

        BigDecimal promedioGlobal = countGlobal > 0
            ? sumaGlobal.divide(BigDecimal.valueOf(countGlobal), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        int alertasAltas = (int) promediosEje.values().stream()
            .filter(p -> "ALTA".equals(p.getNivelAlerta())).count();
        int alertasMedias = (int) promediosEje.values().stream()
            .filter(p -> "MEDIA".equals(p.getNivelAlerta())).count();

        String nombreCompleto = estudiante.getNombre() + " " + estudiante.getApellido1()
            + (estudiante.getApellido2() != null ? " " + estudiante.getApellido2() : "");

        return ResumenPromediosEstudianteDto.builder()
            .estudianteId(estudiante.getId())
            .estudianteNombreCompleto(nombreCompleto)
            .periodoId(periodo.getId())
            .periodoNombre(periodo.getNombre())
            .promedioGlobal(promedioGlobal)
            .promediosPorTipoSaber(promediosTipo)
            .totalAlertasAltas(alertasAltas)
            .totalAlertasMedias(alertasMedias)
            .build();
    }

    static String calcularNivelAlerta(BigDecimal promedio) {
        if (promedio.compareTo(new BigDecimal("2.00")) <= 0) {
            return NivelAlertaTematica.ALTA.name();
        } else if (promedio.compareTo(new BigDecimal("3.00")) <= 0) {
            return NivelAlertaTematica.MEDIA.name();
        }
        return NivelAlertaTematica.SIN_ALERTA.name();
    }

    private EvaluacionSaberResponseDto toResponseDto(EvaluacionSaber eval) {
        String nombreCompleto = eval.getEstudiante().getNombre() + " " + eval.getEstudiante().getApellido1()
            + (eval.getEstudiante().getApellido2() != null ? " " + eval.getEstudiante().getApellido2() : "");

        List<DetalleEvaluacionSaberResponseDto> detallesDto = eval.getDetalles().stream()
            .map(d -> DetalleEvaluacionSaberResponseDto.builder()
                .id(d.getId())
                .ejeTemaaticoId(d.getEjeTematico().getId())
                .ejeNombre(d.getEjeTematico().getNombre())
                .ejeClave(d.getEjeTematico().getClave())
                .valor(d.getValor())
                .nivelDesempenoNombre(nombreNivelDesempeno(d.getValor()))
                .observacion(d.getObservacion())
                .build())
            .toList();

        return EvaluacionSaberResponseDto.builder()
            .id(eval.getId())
            .estudianteId(eval.getEstudiante().getId())
            .estudianteNombreCompleto(nombreCompleto)
            .periodoId(eval.getPeriodo().getId())
            .periodoNombre(eval.getPeriodo().getNombre())
            .usuarioId(eval.getUsuario().getId())
            .seccionId(eval.getSeccion().getId())
            .seccionNombre(eval.getSeccion().getNombre())
            .materiaId(eval.getMateria().getId())
            .materiaNombre(eval.getMateria().getNombre())
            .tipoSaberId(eval.getTipoSaber().getId())
            .tipoSaberNombre(eval.getTipoSaber().getNombre())
            .fechaEvaluacion(eval.getFechaEvaluacion())
            .observacion(eval.getObservacion())
            .detalles(detallesDto)
            .createdAt(eval.getCreatedAt() != null ? eval.getCreatedAt().toLocalDateTime() : null)
            .build();
    }

    private static String nombreNivelDesempeno(short valor) {
        return switch (valor) {
            case 1 -> "Inicial";
            case 2 -> "En desarrollo";
            case 3 -> "Intermedio";
            case 4 -> "Logrado";
            case 5 -> "Avanzado";
            default -> "Desconocido";
        };
    }
}
