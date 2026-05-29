package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.piad.EstudianteImportarDto;
import com.atara.deb.ataraapi.dto.piad.FilaImportacionResultadoDto;
import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.Matricula;
import com.atara.deb.ataraapi.model.Seccion;
import com.atara.deb.ataraapi.model.enums.EstadoEstudiante;
import com.atara.deb.ataraapi.repository.AnioLectivoRepository;
import com.atara.deb.ataraapi.repository.EstudianteRepository;
import com.atara.deb.ataraapi.repository.MatriculaRepository;
import com.atara.deb.ataraapi.repository.SeccionRepository;
import com.atara.deb.ataraapi.service.impl.ImportacionPiadFilaProcessor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Verifica las reglas idempotentes de la importación PIAD fila a fila:
 * reutilizar/crear estudiante y matricular solo si no existe ya en la sección.
 */
@ExtendWith(MockitoExtension.class)
class ImportacionPiadFilaProcessorTest {

    @Mock EstudianteRepository estudianteRepository;
    @Mock MatriculaRepository matriculaRepository;
    @Mock SeccionRepository seccionRepository;
    @Mock AnioLectivoRepository anioLectivoRepository;

    @InjectMocks ImportacionPiadFilaProcessor processor;

    private static final Long SECCION_ID = 5L;
    private static final Long ANIO_ID = 3L;
    private static final LocalDate FECHA = LocalDate.of(2026, 2, 9);

    private EstudianteImportarDto fila(String id) {
        return EstudianteImportarDto.builder()
                .identificacion(id).nombre("ANA").apellido1("MORA").apellido2(null).build();
    }

    private Estudiante estudianteConId(Long id, String identificacion) {
        return Estudiante.builder()
                .id(id).identificacion(identificacion).nombre("ANA").apellido1("MORA")
                .estado(EstadoEstudiante.ACTIVO).build();
    }

    @Test
    void estudianteNuevoSeCreaYMatricula() {
        when(estudianteRepository.findByIdentificacion("1-1-1")).thenReturn(Optional.empty());
        when(estudianteRepository.save(any(Estudiante.class))).thenReturn(estudianteConId(10L, "1-1-1"));
        when(matriculaRepository.existsByEstudianteIdAndSeccionId(10L, SECCION_ID)).thenReturn(false);
        when(seccionRepository.getReferenceById(SECCION_ID)).thenReturn(mock(Seccion.class));
        when(anioLectivoRepository.getReferenceById(ANIO_ID)).thenReturn(mock(AnioLectivo.class));

        FilaImportacionResultadoDto r = processor.procesar(SECCION_ID, ANIO_ID, FECHA, fila("1-1-1"));

        assertThat(r.getEstado()).isEqualTo(ImportacionPiadFilaProcessor.CREADO_Y_MATRICULADO);
        verify(estudianteRepository).save(any(Estudiante.class));
        verify(matriculaRepository).save(any(Matricula.class));
    }

    @Test
    void estudianteExistenteSeReutilizaYMatricula() {
        when(estudianteRepository.findByIdentificacion("2-2-2"))
                .thenReturn(Optional.of(estudianteConId(20L, "2-2-2")));
        when(matriculaRepository.existsByEstudianteIdAndSeccionId(20L, SECCION_ID)).thenReturn(false);
        when(seccionRepository.getReferenceById(SECCION_ID)).thenReturn(mock(Seccion.class));
        when(anioLectivoRepository.getReferenceById(ANIO_ID)).thenReturn(mock(AnioLectivo.class));

        FilaImportacionResultadoDto r = processor.procesar(SECCION_ID, ANIO_ID, FECHA, fila("2-2-2"));

        assertThat(r.getEstado()).isEqualTo(ImportacionPiadFilaProcessor.REUTILIZADO_Y_MATRICULADO);
        verify(estudianteRepository, never()).save(any(Estudiante.class));   // NO se reinserta
        verify(matriculaRepository).save(any(Matricula.class));
    }

    @Test
    void estudianteYaMatriculadoSeOmiteSinError() {
        when(estudianteRepository.findByIdentificacion("3-3-3"))
                .thenReturn(Optional.of(estudianteConId(30L, "3-3-3")));
        when(matriculaRepository.existsByEstudianteIdAndSeccionId(30L, SECCION_ID)).thenReturn(true);

        FilaImportacionResultadoDto r = processor.procesar(SECCION_ID, ANIO_ID, FECHA, fila("3-3-3"));

        assertThat(r.getEstado()).isEqualTo(ImportacionPiadFilaProcessor.YA_MATRICULADO);
        verify(estudianteRepository, never()).save(any(Estudiante.class));   // NO se reinserta
        verify(matriculaRepository, never()).save(any(Matricula.class));     // NO se duplica matrícula
    }
}
