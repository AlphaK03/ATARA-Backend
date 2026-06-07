package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.periodo.PeriodoRequestDto;
import com.atara.deb.ataraapi.dto.periodo.PeriodoResponseDto;
import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.model.Periodo;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.service.impl.PeriodoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PeriodoServiceImplTest {

    @Mock PeriodoRepository periodoRepository;
    @Mock AnioLectivoRepository anioLectivoRepository;
    @Mock EvaluacionRepository evaluacionRepository;
    @Mock EvaluacionSaberRepository evaluacionSaberRepository;
    @Mock AlertaRepository alertaRepository;
    @Mock AlertaTematicaRepository alertaTematicaRepository;

    @InjectMocks PeriodoServiceImpl service;

    private AnioLectivo anio;
    private Periodo periodoActivo;
    private Periodo periodoInactivo;

    @BeforeEach
    void setUp() {
        anio = AnioLectivo.builder().id(1L).anio((short) 2025).activo(true).build();

        periodoActivo = Periodo.builder()
                .id(1L).anioLectivo(anio).nombre("I Trimestre")
                .numeroPeriodo((short) 1).activo(true).build();

        periodoInactivo = Periodo.builder()
                .id(2L).anioLectivo(anio).nombre("II Trimestre")
                .numeroPeriodo((short) 2).activo(false).build();
    }

    // --- crear ---

    @Test
    void crear_exitoso_asignaNumeroCorrecto() {
        PeriodoRequestDto dto = PeriodoRequestDto.builder()
                .nombre("IV Trimestre")
                .anioLectivoId(1L)
                .build();

        when(anioLectivoRepository.findById(1L)).thenReturn(Optional.of(anio));
        when(periodoRepository.findByAnioLectivoId(1L))
                .thenReturn(List.of(periodoActivo, periodoInactivo)); // ya hay 2
        when(periodoRepository.save(any())).thenAnswer(inv -> {
            Periodo p = inv.getArgument(0);
            p.setId(3L);
            return p;
        });

        PeriodoResponseDto resultado = service.crear(dto);

        assertThat(resultado.getNumeroPeriodo()).isEqualTo((short) 3);
        assertThat(resultado.getNombre()).isEqualTo("IV Trimestre");
        assertThat(resultado.getActivo()).isFalse();
    }

    @Test
    void crear_anioLectivoNoExiste_lanzaExcepcion() {
        PeriodoRequestDto dto = PeriodoRequestDto.builder()
                .nombre("IV Trimestre")
                .anioLectivoId(99L)
                .build();

        when(anioLectivoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.crear(dto))
                .isInstanceOf(NoSuchElementException.class);

        verify(periodoRepository, never()).save(any());
    }

    @Test
    void crear_sinAnioLectivoId_lanzaExcepcion() {
        PeriodoRequestDto dto = PeriodoRequestDto.builder()
                .nombre("Trimestre X")
                .anioLectivoId(null)
                .build();

        assertThatThrownBy(() -> service.crear(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("anioLectivoId");
    }

    @Test
    void crear_masDeSeisPeridos_lanzaExcepcion() { // NOSONAR typo preservado para no romper historial de git
        PeriodoRequestDto dto = PeriodoRequestDto.builder()
                .nombre("Séptimo")
                .anioLectivoId(1L)
                .build();

        List<Periodo> seisPeriodos = List.of(
                periodo((short) 1), periodo((short) 2), periodo((short) 3),
                periodo((short) 4), periodo((short) 5), periodo((short) 6)
        );

        when(anioLectivoRepository.findById(1L)).thenReturn(Optional.of(anio));
        when(periodoRepository.findByAnioLectivoId(1L)).thenReturn(seisPeriodos);

        assertThatThrownBy(() -> service.crear(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("6");
    }

    // --- activar ---

    @Test
    void activar_exitoso() {
        when(periodoRepository.findById(2L)).thenReturn(Optional.of(periodoInactivo));
        when(periodoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PeriodoResponseDto resultado = service.activar(2L);

        verify(periodoRepository).desactivarPeriodosDeAnio(1L);
        assertThat(resultado.getActivo()).isTrue();
    }

    @Test
    void activar_noExiste_lanzaExcepcion() {
        when(periodoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.activar(99L))
                .isInstanceOf(NoSuchElementException.class);
    }

    // --- eliminar ---

    @Test
    void eliminar_activo_lanzaExcepcion() {
        when(periodoRepository.findById(1L)).thenReturn(Optional.of(periodoActivo));

        assertThatThrownBy(() -> service.eliminar(1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("activo");

        verify(periodoRepository, never()).deleteById(any());
    }

    @Test
    void eliminar_conEvaluaciones_lanzaExcepcion() {
        when(periodoRepository.findById(2L)).thenReturn(Optional.of(periodoInactivo));
        when(evaluacionRepository.findByPeriodoId(2L)).thenReturn(List.of(mock(
                com.atara.deb.ataraapi.model.Evaluacion.class)));

        assertThatThrownBy(() -> service.eliminar(2L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("evaluaciones");

        verify(periodoRepository, never()).deleteById(any());
    }

    @Test
    void eliminar_exitoso_cascadeCompleto() {
        when(periodoRepository.findById(2L)).thenReturn(Optional.of(periodoInactivo));
        when(evaluacionRepository.findByPeriodoId(2L)).thenReturn(List.of());
        when(evaluacionSaberRepository.findByPeriodoId(2L)).thenReturn(List.of());

        service.eliminar(2L);

        verify(alertaTematicaRepository).deleteAllByPeriodoId(2L);
        verify(alertaRepository).deleteAllByPeriodoId(2L);
        verify(evaluacionSaberRepository).deleteAllByPeriodoId(2L);
        verify(evaluacionRepository).deleteAllByPeriodoId(2L);
        verify(periodoRepository).deleteById(2L);
    }

    // --- helpers ---

    private Periodo periodo(short numero) {
        return Periodo.builder()
                .id((long) numero).anioLectivo(anio)
                .nombre("P" + numero).numeroPeriodo(numero).activo(false)
                .build();
    }
}
