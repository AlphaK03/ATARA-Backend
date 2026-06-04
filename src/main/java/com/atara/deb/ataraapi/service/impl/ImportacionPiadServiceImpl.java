package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.piad.EstudianteImportarDto;
import com.atara.deb.ataraapi.dto.piad.FilaImportacionResultadoDto;
import com.atara.deb.ataraapi.dto.piad.ImportarPiadRequestDto;
import com.atara.deb.ataraapi.dto.piad.ImportarPiadResponseDto;
import com.atara.deb.ataraapi.model.Seccion;
import com.atara.deb.ataraapi.repository.AnioLectivoRepository;
import com.atara.deb.ataraapi.repository.SeccionRepository;
import com.atara.deb.ataraapi.service.ImportacionPiadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ImportacionPiadServiceImpl implements ImportacionPiadService {

    private static final Logger log = LoggerFactory.getLogger(ImportacionPiadServiceImpl.class);

    private final SeccionRepository seccionRepository;
    private final AnioLectivoRepository anioLectivoRepository;
    private final ImportacionPiadFilaProcessor filaProcessor;

    public ImportacionPiadServiceImpl(SeccionRepository seccionRepository,
                                      AnioLectivoRepository anioLectivoRepository,
                                      ImportacionPiadFilaProcessor filaProcessor) {
        this.seccionRepository = seccionRepository;
        this.anioLectivoRepository = anioLectivoRepository;
        this.filaProcessor = filaProcessor;
    }

    /**
     * Valida la sección/año una sola vez y luego procesa cada estudiante en su
     * propia transacción. {@code readOnly = true} en este método solo abre la
     * sesión para validar (lectura con navegación LAZY); las escrituras ocurren
     * en {@link ImportacionPiadFilaProcessor#procesar} con REQUIRES_NEW, por lo
     * que el fallo de una fila no afecta a las demás.
     */
    @Override
    @Transactional(readOnly = true)
    public ImportarPiadResponseDto importar(ImportarPiadRequestDto request) {
        Seccion seccion = seccionRepository.findById(request.getSeccionId())
                .orElseThrow(() -> new NoSuchElementException(
                        "Sección no encontrada con id: " + request.getSeccionId()));

        boolean anioExiste = anioLectivoRepository.existsById(request.getAnioLectivoId());
        if (!anioExiste) {
            throw new NoSuchElementException(
                    "Año lectivo no encontrado con id: " + request.getAnioLectivoId());
        }

        // La sección debe pertenecer al año lectivo indicado (paridad con la matrícula manual).
        if (seccion.getAnioLectivo() == null
                || !seccion.getAnioLectivo().getId().equals(request.getAnioLectivoId())) {
            throw new IllegalArgumentException("La sección no pertenece al año lectivo indicado.");
        }

        LocalDate fecha = request.getFechaMatricula() != null ? request.getFechaMatricula() : LocalDate.now();

        int creados = 0, reutilizados = 0, matriculados = 0, yaMatriculados = 0,
                yaEnOtraSeccion = 0, errores = 0;
        List<FilaImportacionResultadoDto> detalle = new ArrayList<>();

        for (EstudianteImportarDto fila : request.getEstudiantes()) {
            try {
                FilaImportacionResultadoDto r = filaProcessor.procesar(
                        request.getSeccionId(), request.getAnioLectivoId(), fecha, fila);
                detalle.add(r);
                switch (r.getEstado()) {
                    case ImportacionPiadFilaProcessor.CREADO_Y_MATRICULADO -> { creados++; matriculados++; }
                    case ImportacionPiadFilaProcessor.REUTILIZADO_Y_MATRICULADO -> { reutilizados++; matriculados++; }
                    case ImportacionPiadFilaProcessor.YA_MATRICULADO -> { reutilizados++; yaMatriculados++; }
                    case ImportacionPiadFilaProcessor.YA_EN_OTRA_SECCION -> { reutilizados++; yaEnOtraSeccion++; }
                    default -> { /* no debería ocurrir */ }
                }
            } catch (Exception e) {
                // Una fila con error inesperado NO detiene la importación.
                errores++;
                log.warn("Fila PIAD con identificación '{}' falló: {}",
                        fila.getIdentificacion(), e.getMessage());
                detalle.add(FilaImportacionResultadoDto.builder()
                        .identificacion(fila.getIdentificacion())
                        .nombreCompleto(((fila.getApellido1() != null ? fila.getApellido1() : "")
                                + " " + (fila.getNombre() != null ? fila.getNombre() : "")).trim())
                        .estado("ERROR")
                        .mensaje("No se pudo procesar: " + e.getMessage())
                        .build());
            }
        }

        return ImportarPiadResponseDto.builder()
                .total(request.getEstudiantes().size())
                .creados(creados)
                .reutilizados(reutilizados)
                .matriculados(matriculados)
                .yaMatriculados(yaMatriculados)
                .yaEnOtraSeccion(yaEnOtraSeccion)
                .errores(errores)
                .detalle(detalle)
                .build();
    }
}
