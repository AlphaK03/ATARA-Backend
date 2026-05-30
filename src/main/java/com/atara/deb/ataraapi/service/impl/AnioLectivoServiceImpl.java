package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.aniolectivo.AnioLectivoRequestDto;
import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.model.Periodo;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.service.AnioLectivoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.time.ZoneId;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
@Transactional
public class AnioLectivoServiceImpl implements AnioLectivoService {

    private final AnioLectivoRepository anioLectivoRepository;
    private final PeriodoRepository periodoRepository;
    private final SeccionRepository seccionRepository;
    private final MatriculaRepository matriculaRepository;
    private final EvaluacionRepository evaluacionRepository;
    private final EvaluacionSaberRepository evaluacionSaberRepository;
    private final AlertaRepository alertaRepository;
    private final AlertaTematicaRepository alertaTematicaRepository;

    private static final String[] NOMBRES_TRIMESTRE = {
        "I Trimestre", "II Trimestre", "III Trimestre"
    };

    /**
     * Zona horaria de Costa Rica (UTC-6, sin horario de verano). Se fija de forma
     * explícita para que el "año natural en curso" se calcule según el calendario
     * de CR y no según la zona del servidor: en un despliegue en la nube el JVM
     * suele correr en UTC, lo que adelantaría ~6 h el cambio de año. Debe coincidir
     * con la zona del {@code @Scheduled} en AnioLectivoInitializer.
     */
    private static final ZoneId ZONA_CR = ZoneId.of("America/Costa_Rica");

    public AnioLectivoServiceImpl(AnioLectivoRepository anioLectivoRepository,
                                   PeriodoRepository periodoRepository,
                                   SeccionRepository seccionRepository,
                                   MatriculaRepository matriculaRepository,
                                   EvaluacionRepository evaluacionRepository,
                                   EvaluacionSaberRepository evaluacionSaberRepository,
                                   AlertaRepository alertaRepository,
                                   AlertaTematicaRepository alertaTematicaRepository) {
        this.anioLectivoRepository = anioLectivoRepository;
        this.periodoRepository = periodoRepository;
        this.seccionRepository = seccionRepository;
        this.matriculaRepository = matriculaRepository;
        this.evaluacionRepository = evaluacionRepository;
        this.evaluacionSaberRepository = evaluacionSaberRepository;
        this.alertaRepository = alertaRepository;
        this.alertaTematicaRepository = alertaTematicaRepository;
    }

    @Override
    public AnioLectivo crear(AnioLectivo anioLectivo) {
        if (anioLectivoRepository.existsByAnio(anioLectivo.getAnio())) {
            throw new IllegalArgumentException(
                "Ya existe un año lectivo para el año: " + anioLectivo.getAnio()
            );
        }
        if (anioLectivo.getActivo() == null) {
            anioLectivo.setActivo(false);
        }

        AnioLectivo guardado = anioLectivoRepository.save(anioLectivo);

        // Generar automáticamente los 3 trimestres
        crearTrimestres(guardado);

        return guardado;
    }

    @Override
    public AnioLectivo asegurarAnioActual() {
        short anioActual = (short) Year.now(ZONA_CR).getValue();

        // Idempotente: si el año en curso ya existe, no se toca.
        Optional<AnioLectivo> existente = anioLectivoRepository.findByAnio(anioActual);
        if (existente.isPresent()) {
            return existente.get();
        }

        // Inserción idempotente (hallazgo B-05): bajo concurrencia (arranque +
        // @Scheduled + endpoint) solo un proceso inserta el año; los demás reciben 0
        // y reutilizan el existente sin fallar (evita el 500/WARN de la carrera).
        int filas = anioLectivoRepository.insertarSiNoExiste(anioActual);
        if (filas > 0) {
            // Este proceso creó el año: activarlo (desactivando los demás) y generar
            // sus 3 trimestres. desactivarTodos limpia el contexto, por lo que se
            // recarga el año como entidad gestionada antes de modificarlo.
            anioLectivoRepository.desactivarTodos();
            AnioLectivo nuevo = anioLectivoRepository.findByAnio(anioActual)
                    .orElseThrow(() -> new IllegalStateException(
                            "No se pudo asegurar el año lectivo " + anioActual));
            nuevo.setActivo(true);
            anioLectivoRepository.save(nuevo);
            crearTrimestres(nuevo);
            return nuevo;
        }

        // Otro proceso lo creó en paralelo: se reutiliza.
        return anioLectivoRepository.findByAnio(anioActual)
                .orElseThrow(() -> new IllegalStateException(
                        "No se pudo asegurar el año lectivo " + anioActual));
    }

    private void crearTrimestres(AnioLectivo anio) {
        for (int i = 0; i < 3; i++) {
            periodoRepository.save(Periodo.builder()
                    .anioLectivo(anio)
                    .nombre(NOMBRES_TRIMESTRE[i])
                    .numeroPeriodo((short) (i + 1))
                    .activo(i == 0)   // el primer trimestre queda activo
                    .build());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnioLectivo> listarTodos() {
        return anioLectivoRepository.findAllByOrderByAnioDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AnioLectivo> obtenerActivo() {
        return anioLectivoRepository.findByActivoTrue();
    }

    @Override
    @Transactional(readOnly = true)
    public AnioLectivo buscarPorId(Long id) {
        return anioLectivoRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Año lectivo no encontrado con id: " + id));
    }

    @Override
    public AnioLectivo actualizar(Long id, AnioLectivoRequestDto dto) {
        AnioLectivo anio = buscarPorId(id);
        if (!anio.getAnio().equals(dto.getAnio()) && anioLectivoRepository.existsByAnio(dto.getAnio())) {
            throw new IllegalArgumentException("Ya existe un año lectivo para el año: " + dto.getAnio());
        }
        anio.setAnio(dto.getAnio());
        return anioLectivoRepository.save(anio);
    }

    @Override
    public AnioLectivo activar(Long id) {
        AnioLectivo anioLectivo = buscarPorId(id);
        anioLectivoRepository.desactivarTodos();
        anioLectivo.setActivo(true);
        return anioLectivoRepository.save(anioLectivo);
    }

    @Override
    public void eliminar(Long id) {
        AnioLectivo anio = buscarPorId(id);
        if (Boolean.TRUE.equals(anio.getActivo())) {
            throw new IllegalArgumentException(
                "No se puede eliminar el año lectivo activo. " +
                "Activa otro año lectivo antes de eliminar éste.");
        }

        // Eliminar datos de cada periodo (alertas → evaluaciones → periodos)
        List<Periodo> periodos = periodoRepository.findByAnioLectivoId(id);
        for (Periodo p : periodos) {
            alertaTematicaRepository.deleteAllByPeriodoId(p.getId());
            alertaRepository.deleteAllByPeriodoId(p.getId());
            evaluacionSaberRepository.deleteAllByPeriodoId(p.getId()); // cascada a detalles
            evaluacionRepository.deleteAllByPeriodoId(p.getId());      // cascada a detalles
        }
        periodoRepository.deleteAll(periodos);

        // Eliminar matrículas y secciones del año
        matriculaRepository.deleteAllByAnioLectivoId(id);
        seccionRepository.deleteAll(seccionRepository.findByAnioLectivoId(id));

        anioLectivoRepository.deleteById(id);
    }
}
