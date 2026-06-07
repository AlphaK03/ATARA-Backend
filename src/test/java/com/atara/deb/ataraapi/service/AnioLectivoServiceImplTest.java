package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.model.Periodo;
import com.atara.deb.ataraapi.model.Seccion;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.service.impl.AnioLectivoServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Year;
import java.time.ZoneId;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnioLectivoServiceImplTest {

    @Mock AnioLectivoRepository anioLectivoRepository;
    @Mock PeriodoRepository periodoRepository;
    @Mock SeccionRepository seccionRepository;
    @Mock MatriculaRepository matriculaRepository;
    @Mock EvaluacionRepository evaluacionRepository;
    @Mock EvaluacionSaberRepository evaluacionSaberRepository;
    @Mock AlertaRepository alertaRepository;
    @Mock AlertaTematicaRepository alertaTematicaRepository;

    @InjectMocks AnioLectivoServiceImpl service;

    // Misma zona que AnioLectivoServiceImpl, para no fallar en la ventana de fin de año.
    private static final short ANIO_ACTUAL =
            (short) Year.now(ZoneId.of("America/Costa_Rica")).getValue();

    // --- crear ---

    @Test
    void crear_exitoso_generaTrimestres() {
        AnioLectivo nuevo = AnioLectivo.builder().anio((short) 2027).build();

        when(anioLectivoRepository.existsByAnio((short) 2027)).thenReturn(false);
        when(anioLectivoRepository.save(any())).thenAnswer(inv -> {
            AnioLectivo a = inv.getArgument(0);
            a.setId(10L);
            return a;
        });

        AnioLectivo resultado = service.crear(nuevo);

        assertThat(resultado.getActivo()).isFalse(); // default cuando llega null
        assertThat(resultado.getId()).isEqualTo(10L);

        ArgumentCaptor<Periodo> captor = ArgumentCaptor.forClass(Periodo.class);
        verify(periodoRepository, times(3)).save(captor.capture());
        List<Periodo> trimestres = captor.getAllValues();
        assertThat(trimestres).extracting(Periodo::getNumeroPeriodo)
                .containsExactly((short) 1, (short) 2, (short) 3);
        assertThat(trimestres.get(0).getActivo()).isTrue();
        assertThat(trimestres.get(1).getActivo()).isFalse();
        assertThat(trimestres.get(2).getActivo()).isFalse();
    }

    @Test
    void crear_anioRepetido_lanzaExcepcion() {
        AnioLectivo duplicado = AnioLectivo.builder().anio((short) 2025).build();

        when(anioLectivoRepository.existsByAnio((short) 2025)).thenReturn(true);

        assertThatThrownBy(() -> service.crear(duplicado))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2025");

        verify(anioLectivoRepository, never()).save(any());
        verify(periodoRepository, never()).save(any());
    }

    // --- activar ---

    @Test
    void activar_exitoso_desactivaTodosYActiva() {
        AnioLectivo inactivo = AnioLectivo.builder().id(2L).anio((short) 2025).activo(false).build();

        when(anioLectivoRepository.findById(2L)).thenReturn(Optional.of(inactivo));
        when(anioLectivoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AnioLectivo resultado = service.activar(2L);

        verify(anioLectivoRepository).desactivarTodos();
        assertThat(resultado.getActivo()).isTrue();
    }

    @Test
    void activar_noExiste_lanzaExcepcion() {
        when(anioLectivoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.activar(99L))
                .isInstanceOf(NoSuchElementException.class);
    }

    // --- eliminar ---

    @Test
    void eliminar_activo_lanzaExcepcion() {
        AnioLectivo activo = AnioLectivo.builder().id(1L).anio((short) 2025).activo(true).build();

        when(anioLectivoRepository.findById(1L)).thenReturn(Optional.of(activo));

        assertThatThrownBy(() -> service.eliminar(1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("activo");

        verify(anioLectivoRepository, never()).deleteById(any());
        verify(periodoRepository, never()).deleteAll(any());
    }

    @Test
    void eliminar_exitoso_cascadeCompleto() {
        AnioLectivo inactivo = AnioLectivo.builder().id(1L).anio((short) 2025).activo(false).build();
        Periodo p1 = Periodo.builder().id(10L).anioLectivo(inactivo)
                .nombre("I Trimestre").numeroPeriodo((short) 1).activo(false).build();
        Periodo p2 = Periodo.builder().id(20L).anioLectivo(inactivo)
                .nombre("II Trimestre").numeroPeriodo((short) 2).activo(false).build();
        List<Periodo> periodos = List.of(p1, p2);
        Seccion seccion = Seccion.builder().id(100L).nombre("1A").build();

        when(anioLectivoRepository.findById(1L)).thenReturn(Optional.of(inactivo));
        when(periodoRepository.findByAnioLectivoId(1L)).thenReturn(periodos);
        when(seccionRepository.findByAnioLectivoId(1L)).thenReturn(List.of(seccion));

        service.eliminar(1L);

        // Cascade por período: alertas temáticas → alertas → evaluaciones saber → evaluaciones
        verify(alertaTematicaRepository).deleteAllByPeriodoId(10L);
        verify(alertaTematicaRepository).deleteAllByPeriodoId(20L);
        verify(alertaRepository).deleteAllByPeriodoId(10L);
        verify(alertaRepository).deleteAllByPeriodoId(20L);
        verify(evaluacionSaberRepository).deleteAllByPeriodoId(10L);
        verify(evaluacionSaberRepository).deleteAllByPeriodoId(20L);
        verify(evaluacionRepository).deleteAllByPeriodoId(10L);
        verify(evaluacionRepository).deleteAllByPeriodoId(20L);
        verify(periodoRepository).deleteAll(periodos);
        // Luego matrículas y secciones del año
        verify(matriculaRepository).deleteAllByAnioLectivoId(1L);
        verify(seccionRepository).deleteAll(List.of(seccion));
        verify(anioLectivoRepository).deleteById(1L);
    }

    // --- asegurarAnioActual ---

    @Test
    void asegurarAnioActual_noExiste_creaActivaYGeneraTrimestres() {
        AnioLectivo recienCreado = AnioLectivo.builder().anio(ANIO_ACTUAL).activo(false).build();
        // 1ª comprobación: no existe → se inserta (gana la carrera, filas=1) → se recarga.
        when(anioLectivoRepository.findByAnio(ANIO_ACTUAL))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(recienCreado));
        when(anioLectivoRepository.insertarSiNoExiste(ANIO_ACTUAL)).thenReturn(1);
        when(anioLectivoRepository.save(any())).thenAnswer(inv -> {
            AnioLectivo a = inv.getArgument(0);
            a.setId(10L);
            return a;
        });

        AnioLectivo resultado = service.asegurarAnioActual();

        // Se desactivó cualquier año previo antes de activar el nuevo
        verify(anioLectivoRepository).desactivarTodos();
        assertThat(resultado.getAnio()).isEqualTo(ANIO_ACTUAL);
        assertThat(resultado.getActivo()).isTrue();

        // Se crearon exactamente 3 trimestres, el primero activo
        ArgumentCaptor<Periodo> captor = ArgumentCaptor.forClass(Periodo.class);
        verify(periodoRepository, times(3)).save(captor.capture());
        List<Periodo> trimestres = captor.getAllValues();
        assertThat(trimestres).extracting(Periodo::getNumeroPeriodo)
                .containsExactly((short) 1, (short) 2, (short) 3);
        assertThat(trimestres.get(0).getActivo()).isTrue();
        assertThat(trimestres.get(1).getActivo()).isFalse();
        assertThat(trimestres.get(2).getActivo()).isFalse();
    }

    @Test
    void asegurarAnioActual_carreraConcurrente_reutilizaSinDuplicar() {
        AnioLectivo creadoPorOtro = AnioLectivo.builder().id(7L).anio(ANIO_ACTUAL).activo(true).build();
        when(anioLectivoRepository.findByAnio(ANIO_ACTUAL))
                .thenReturn(Optional.empty())             // aún no lo veía
                .thenReturn(Optional.of(creadoPorOtro));  // otro proceso lo insertó en paralelo
        when(anioLectivoRepository.insertarSiNoExiste(ANIO_ACTUAL)).thenReturn(0); // perdió la carrera

        AnioLectivo resultado = service.asegurarAnioActual();

        assertThat(resultado).isSameAs(creadoPorOtro);
        // No re-crea, no re-activa ni genera trimestres: lo hizo el proceso ganador.
        verify(anioLectivoRepository, never()).desactivarTodos();
        verify(anioLectivoRepository, never()).save(any());
        verify(periodoRepository, never()).save(any());
    }

    @Test
    void asegurarAnioActual_yaExiste_esIdempotente() {
        AnioLectivo existente = AnioLectivo.builder()
                .id(5L).anio(ANIO_ACTUAL).activo(false).build();
        when(anioLectivoRepository.findByAnio(ANIO_ACTUAL)).thenReturn(Optional.of(existente));

        AnioLectivo resultado = service.asegurarAnioActual();

        assertThat(resultado).isSameAs(existente);
        // No se crea nada ni se altera el estado de activación previo
        verify(anioLectivoRepository, never()).save(any());
        verify(anioLectivoRepository, never()).desactivarTodos();
        verify(periodoRepository, never()).save(any());
    }
}
