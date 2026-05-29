package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.piad.EstudianteImportarDto;
import com.atara.deb.ataraapi.dto.piad.FilaImportacionResultadoDto;
import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.Matricula;
import com.atara.deb.ataraapi.model.Seccion;
import com.atara.deb.ataraapi.model.enums.EstadoEstudiante;
import com.atara.deb.ataraapi.model.enums.EstadoMatricula;
import com.atara.deb.ataraapi.repository.AnioLectivoRepository;
import com.atara.deb.ataraapi.repository.EstudianteRepository;
import com.atara.deb.ataraapi.repository.MatriculaRepository;
import com.atara.deb.ataraapi.repository.SeccionRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Procesa UNA fila de la importación PIAD en su propia transacción
 * ({@link Propagation#REQUIRES_NEW}), de modo que un fallo inesperado en una
 * fila no aborte el resto del lote. El orquestador
 * ({@link ImportacionPiadServiceImpl}) invoca este bean por cada estudiante.
 *
 * <p>Reglas idempotentes (no lanzan error ante duplicados):
 * <ol>
 *   <li>Estudiante: si ya existe por identificación se reutiliza; si no, se crea.</li>
 *   <li>Matrícula: se crea solo si el estudiante aún no pertenece a la sección.</li>
 * </ol>
 */
@Component
public class ImportacionPiadFilaProcessor {

    public static final String CREADO_Y_MATRICULADO     = "CREADO_Y_MATRICULADO";
    public static final String REUTILIZADO_Y_MATRICULADO = "REUTILIZADO_Y_MATRICULADO";
    public static final String YA_MATRICULADO           = "YA_MATRICULADO";

    private final EstudianteRepository estudianteRepository;
    private final MatriculaRepository matriculaRepository;
    private final SeccionRepository seccionRepository;
    private final AnioLectivoRepository anioLectivoRepository;

    public ImportacionPiadFilaProcessor(EstudianteRepository estudianteRepository,
                                        MatriculaRepository matriculaRepository,
                                        SeccionRepository seccionRepository,
                                        AnioLectivoRepository anioLectivoRepository) {
        this.estudianteRepository = estudianteRepository;
        this.matriculaRepository = matriculaRepository;
        this.seccionRepository = seccionRepository;
        this.anioLectivoRepository = anioLectivoRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public FilaImportacionResultadoDto procesar(Long seccionId,
                                                Long anioLectivoId,
                                                LocalDate fechaMatricula,
                                                EstudianteImportarDto fila) {
        String identificacion = fila.getIdentificacion().trim();

        // ── Paso 1: reutilizar o crear estudiante (nunca reinsertar) ──────────
        Estudiante estudiante = estudianteRepository.findByIdentificacion(identificacion).orElse(null);
        boolean creado = false;
        if (estudiante == null) {
            estudiante = estudianteRepository.save(Estudiante.builder()
                    .identificacion(identificacion)
                    .nombre(fila.getNombre().trim())
                    .apellido1(fila.getApellido1().trim())
                    .apellido2(normalizarOpcional(fila.getApellido2()))
                    .estado(EstadoEstudiante.ACTIVO)
                    .build());
            creado = true;
        }

        // ── Paso 2: matricular en la sección solo si aún no lo está ───────────
        String estado;
        if (matriculaRepository.existsByEstudianteIdAndSeccionId(estudiante.getId(), seccionId)) {
            estado = YA_MATRICULADO;
        } else {
            // getReferenceById: proxy por id, sin SELECT extra — solo se usa la FK.
            Seccion seccion = seccionRepository.getReferenceById(seccionId);
            AnioLectivo anio = anioLectivoRepository.getReferenceById(anioLectivoId);
            matriculaRepository.save(Matricula.builder()
                    .estudiante(estudiante)
                    .seccion(seccion)
                    .anioLectivo(anio)
                    .estado(EstadoMatricula.ACTIVO)
                    .fechaMatricula(fechaMatricula)
                    .build());
            estado = creado ? CREADO_Y_MATRICULADO : REUTILIZADO_Y_MATRICULADO;
        }

        return FilaImportacionResultadoDto.builder()
                .identificacion(identificacion)
                .nombreCompleto(nombreCompleto(estudiante))
                .estado(estado)
                .mensaje(mensajePara(estado))
                .build();
    }

    private String normalizarOpcional(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private String nombreCompleto(Estudiante e) {
        StringBuilder sb = new StringBuilder(e.getApellido1());
        if (e.getApellido2() != null && !e.getApellido2().isBlank()) {
            sb.append(' ').append(e.getApellido2());
        }
        sb.append(' ').append(e.getNombre());
        return sb.toString();
    }

    private String mensajePara(String estado) {
        return switch (estado) {
            case CREADO_Y_MATRICULADO      -> "Estudiante nuevo: creado y matriculado.";
            case REUTILIZADO_Y_MATRICULADO -> "Ya existía: matriculado en la sección.";
            case YA_MATRICULADO            -> "Ya pertenecía a la sección: omitido.";
            default                        -> "";
        };
    }
}
