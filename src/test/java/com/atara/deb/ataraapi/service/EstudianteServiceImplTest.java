package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.enums.EstadoEstudiante;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.service.impl.EstudianteServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EstudianteServiceImplTest {

    @Mock EstudianteRepository estudianteRepository;
    @Mock MatriculaRepository matriculaRepository;
    @Mock EvaluacionRepository evaluacionRepository;
    @Mock EvaluacionSaberRepository evaluacionSaberRepository;
    @Mock AlertaRepository alertaRepository;
    @Mock AlertaTematicaRepository alertaTematicaRepository;
    @Mock com.atara.deb.ataraapi.security.ContextoUsuarioService contextoUsuarioService;

    @InjectMocks EstudianteServiceImpl service;

    private Estudiante estudianteBase;

    @BeforeEach
    void setUp() {
        estudianteBase = Estudiante.builder()
                .id(1L)
                .identificacion("2018-001")
                .nombre("Luis")
                .apellido1("Hernández")
                .estado(EstadoEstudiante.ACTIVO)
                .build();
    }

    // --- registrar ---

    @Test
    void registrar_exitoso() {
        Estudiante nuevo = Estudiante.builder()
                .identificacion("2018-999")
                .nombre("Ana")
                .apellido1("García")
                .build();

        when(estudianteRepository.existsByIdentificacion("2018-999")).thenReturn(false);
        when(estudianteRepository.save(any())).thenAnswer(inv -> {
            Estudiante e = inv.getArgument(0);
            e.setId(2L);
            return e;
        });

        Estudiante resultado = service.registrar(nuevo);

        assertThat(resultado.getId()).isEqualTo(2L);
        assertThat(resultado.getEstado()).isEqualTo(EstadoEstudiante.ACTIVO); // default asignado
        verify(estudianteRepository).save(nuevo);
    }

    @Test
    void registrar_identificacionDuplicada_lanzaExcepcion() {
        Estudiante nuevo = Estudiante.builder()
                .identificacion("2018-001")
                .nombre("Otro")
                .apellido1("Apellido")
                .build();

        when(estudianteRepository.existsByIdentificacion("2018-001")).thenReturn(true);

        assertThatThrownBy(() -> service.registrar(nuevo))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("2018-001");

        verify(estudianteRepository, never()).save(any());
    }

    // --- buscarPorId ---

    @Test
    void buscarPorId_noExiste_lanzaExcepcion() {
        when(estudianteRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buscarPorId(99L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("99");
    }

    // --- actualizar ---

    @Test
    void actualizar_sinEstado_conservaEstadoExistente() {
        Estudiante datos = Estudiante.builder()
                .identificacion("2018-001")
                .nombre("Luis")
                .apellido1("Hernández")
                .estado(null) // no viene en el request
                .build();

        when(estudianteRepository.findById(1L)).thenReturn(Optional.of(estudianteBase));
        when(estudianteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Estudiante resultado = service.actualizar(1L, datos);

        assertThat(resultado.getEstado()).isEqualTo(EstadoEstudiante.ACTIVO); // no se nullificó
    }

    @Test
    void actualizar_conEstado_actualizaEstado() {
        Estudiante datos = Estudiante.builder()
                .identificacion("2018-001")
                .nombre("Luis")
                .apellido1("Hernández")
                .estado(EstadoEstudiante.INACTIVO)
                .build();

        when(estudianteRepository.findById(1L)).thenReturn(Optional.of(estudianteBase));
        when(estudianteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Estudiante resultado = service.actualizar(1L, datos);

        assertThat(resultado.getEstado()).isEqualTo(EstadoEstudiante.INACTIVO);
    }

    // --- eliminar ---

    @Test
    void eliminar_exitoso_cascadeComplete() {
        when(estudianteRepository.findById(1L)).thenReturn(Optional.of(estudianteBase));

        service.eliminar(1L);

        verify(alertaTematicaRepository).deleteAllByEstudianteId(1L);
        verify(alertaRepository).deleteAllByEstudianteId(1L);
        verify(evaluacionSaberRepository).deleteAllByEstudianteId(1L);
        verify(evaluacionRepository).deleteAllByEstudianteId(1L);
        verify(matriculaRepository).deleteAllByEstudianteId(1L);
        verify(estudianteRepository).deleteById(1L);
    }

    @Test
    void eliminar_noExiste_lanzaExcepcion() {
        when(estudianteRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.eliminar(99L))
                .isInstanceOf(NoSuchElementException.class);

        verify(estudianteRepository, never()).deleteById(any());
    }
}
