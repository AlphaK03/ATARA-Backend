package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.model.Periodo;
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

    // --- asegurarAnioActual ---

    @Test
    void asegurarAnioActual_noExiste_creaActivaYGeneraTrimestres() {
        when(anioLectivoRepository.findByAnio(ANIO_ACTUAL)).thenReturn(Optional.empty());
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
