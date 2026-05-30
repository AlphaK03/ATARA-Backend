package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.saber.ResumenPromediosEstudianteDto;
import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.Matricula;
import com.atara.deb.ataraapi.model.Periodo;
import com.atara.deb.ataraapi.model.Seccion;
import com.atara.deb.ataraapi.model.enums.RolNombre;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.security.ContextoUsuario;
import com.atara.deb.ataraapi.security.ContextoUsuarioService;
import com.atara.deb.ataraapi.service.impl.EvaluacionSaberServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas de aislamiento por sección/docente para los PROMEDIOS por saber
 * (Bug 2 — fuga de datos entre docentes). Verifican que la agregación usa las
 * consultas acotadas por {@code seccion_id} en lugar de la global por estudiante.
 */
@ExtendWith(MockitoExtension.class)
class EvaluacionSaberServiceImplPromediosTest {

    @Mock EvaluacionSaberRepository evaluacionSaberRepository;
    @Mock DetalleEvaluacionSaberRepository detalleRepository;
    @Mock EstudianteRepository estudianteRepository;
    @Mock PeriodoRepository periodoRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock SeccionRepository seccionRepository;
    @Mock TipoSaberRepository tipoSaberRepository;
    @Mock EjeTemaaticoRepository ejeTemaaticoRepository;
    @Mock MatriculaRepository matriculaRepository;
    @Mock MateriaRepository materiaRepository;
    @Mock ContextoUsuarioService contextoUsuarioService;

    @InjectMocks EvaluacionSaberServiceImpl service;

    private static final long PERIODO_ID = 7L;
    private static final long SECCION_B  = 200L;
    private static final long EST_ID     = 500L;
    private static final int  MATERIA_ID = 10;

    private ContextoUsuario adminCtx() {
        return new ContextoUsuario(1L, RolNombre.ADMIN, true, Set.of(), Set.of());
    }

    private ContextoUsuario docenteBCtx() {
        return new ContextoUsuario(2L, RolNombre.DOCENTE, false, Set.of(SECCION_B), Set.of(MATERIA_ID));
    }

    @Test
    void obtenerPromediosSeccion_usaConsultaAcotadaPorSeccion() {
        Periodo periodo = Periodo.builder().id(PERIODO_ID).nombre("I Trimestre")
                .numeroPeriodo((short) 1).activo(true).build();
        Estudiante est = Estudiante.builder().id(EST_ID).identificacion("X1")
                .nombre("Ana").apellido1("Soto").build();
        Seccion seccionB = Seccion.builder().id(SECCION_B).nombre("B").build();

        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(adminCtx());
        when(periodoRepository.findById(PERIODO_ID)).thenReturn(Optional.of(periodo));
        when(matriculaRepository.findBySeccionId(SECCION_B))
                .thenReturn(List.of(Matricula.builder().estudiante(est).seccion(seccionB).build()));
        when(estudianteRepository.findById(EST_ID)).thenReturn(Optional.of(est));
        when(detalleRepository.findByEstudiantePeriodoYSeccion(EST_ID, PERIODO_ID, SECCION_B))
                .thenReturn(List.of());

        List<ResumenPromediosEstudianteDto> result =
                service.obtenerPromediosSeccion(SECCION_B, PERIODO_ID);

        assertThat(result).isEmpty(); // sin detalles en esta sección → sin resumen
        verify(detalleRepository).findByEstudiantePeriodoYSeccion(EST_ID, PERIODO_ID, SECCION_B);
        verify(detalleRepository, never()).findByEstudianteAndPeriodo(anyLong(), anyLong());
    }

    @Test
    void obtenerPromedios_docente_seAcotaASusSecciones() {
        Periodo periodo = Periodo.builder().id(PERIODO_ID).nombre("I Trimestre")
                .numeroPeriodo((short) 1).activo(true).build();
        Estudiante est = Estudiante.builder().id(EST_ID).identificacion("X1")
                .nombre("Ana").apellido1("Soto").build();

        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(docenteBCtx());
        when(estudianteRepository.findById(EST_ID)).thenReturn(Optional.of(est));
        when(periodoRepository.findById(PERIODO_ID)).thenReturn(Optional.of(periodo));
        when(detalleRepository.findByEstudiantePeriodoYSecciones(EST_ID, PERIODO_ID, Set.of(SECCION_B)))
                .thenReturn(List.of());

        ResumenPromediosEstudianteDto result = service.obtenerPromedios(EST_ID, PERIODO_ID);

        assertThat(result).isNotNull();
        verify(detalleRepository).findByEstudiantePeriodoYSecciones(EST_ID, PERIODO_ID, Set.of(SECCION_B));
        verify(detalleRepository, never()).findByEstudianteAndPeriodo(anyLong(), anyLong());
    }

    @Test
    void obtenerPromedios_admin_visionGlobal() {
        Periodo periodo = Periodo.builder().id(PERIODO_ID).nombre("I Trimestre")
                .numeroPeriodo((short) 1).activo(true).build();
        Estudiante est = Estudiante.builder().id(EST_ID).identificacion("X1")
                .nombre("Ana").apellido1("Soto").build();

        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(adminCtx());
        when(estudianteRepository.findById(EST_ID)).thenReturn(Optional.of(est));
        when(periodoRepository.findById(PERIODO_ID)).thenReturn(Optional.of(periodo));
        when(detalleRepository.findByEstudianteAndPeriodo(EST_ID, PERIODO_ID)).thenReturn(List.of());

        ResumenPromediosEstudianteDto result = service.obtenerPromedios(EST_ID, PERIODO_ID);

        assertThat(result).isNotNull();
        verify(detalleRepository).findByEstudianteAndPeriodo(EST_ID, PERIODO_ID);
        verify(detalleRepository, never()).findByEstudiantePeriodoYSecciones(anyLong(), anyLong(), anyCollection());
    }
}
