package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.alertatematica.AlertaTematicaResponseDto;
import com.atara.deb.ataraapi.exception.AccesoDenegadoException;
import com.atara.deb.ataraapi.model.*;
import com.atara.deb.ataraapi.model.enums.RolNombre;
import com.atara.deb.ataraapi.repository.*;
import com.atara.deb.ataraapi.security.ContextoUsuario;
import com.atara.deb.ataraapi.security.ContextoUsuarioService;
import com.atara.deb.ataraapi.service.impl.AlertaTematicaServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Pruebas de aislamiento por sección/docente (Bug 2 — fuga de datos entre docentes).
 *
 * <p>Escenario: dos docentes (A y B), cada uno con su sección, y el MISMO estudiante
 * matriculado en ambas. Solo A evalúa. Estas pruebas comprueban a nivel de servicio que:
 * <ul>
 *   <li>la lectura y la generación de alertas se acotan a la sección consultada,</li>
 *   <li>la regeneración por el docente B nunca toca (borra) las alertas del docente A,
 *       porque la limpieza incluye {@code seccion_id} de B, no el de A.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class AlertaTematicaServiceImplTest {

    @Mock AlertaTematicaRepository alertaRepository;
    @Mock DetalleEvaluacionSaberRepository detalleRepository;
    @Mock EstudianteRepository estudianteRepository;
    @Mock PeriodoRepository periodoRepository;
    @Mock SeccionRepository seccionRepository;
    @Mock MatriculaRepository matriculaRepository;
    @Mock ContextoUsuarioService contextoUsuarioService;

    @InjectMocks AlertaTematicaServiceImpl service;

    private static final long PERIODO_ID = 7L;
    private static final long SECCION_A  = 100L; // docente A
    private static final long SECCION_B  = 200L; // docente B
    private static final long EST_ID     = 500L; // mismo estudiante en A y B
    private static final int  MATERIA_ID = 10;
    private static final int  EJE_ID     = 55;
    private static final int  USUARIO_B  = 2;

    private ContextoUsuario adminCtx() {
        return new ContextoUsuario(1L, RolNombre.ADMIN, true, Set.of(), Set.of());
    }

    /** Docente B: solo ve/opera su sección (SECCION_B). */
    private ContextoUsuario docenteBCtx() {
        return new ContextoUsuario((long) USUARIO_B, RolNombre.DOCENTE, false,
                Set.of(SECCION_B), Set.of(MATERIA_ID));
    }

    // ── Generación acotada por sección ──────────────────────────────────────

    @Test
    void generarAlertasPorSeccion_limpiaSoloLaSeccionConsultada_yMarcaSeccionEnLaAlerta() {
        Seccion seccionB = Seccion.builder().id(SECCION_B).nombre("B").build();
        Periodo periodo  = Periodo.builder().id(PERIODO_ID).nombre("I Trimestre")
                .numeroPeriodo((short) 1).activo(true).build();
        Estudiante est   = Estudiante.builder().id(EST_ID).identificacion("X1")
                .nombre("Ana").apellido1("Soto").build();

        Materia materia  = Materia.builder().id(MATERIA_ID).clave("MAT").nombre("Matemáticas").build();
        TipoSaber tipo   = TipoSaber.builder().id(1).clave("CONCEPTUAL").nombre("Conceptual").build();
        EjeTematico eje  = EjeTematico.builder().id(EJE_ID).materia(materia).tipoSaber(tipo)
                .clave("MAT_E1").nombre("Números").orden((short) 1).build();
        EvaluacionSaber es = EvaluacionSaber.builder().materia(materia).seccion(seccionB).build();
        // valor mínimo (1) → promedio 1.00 → alerta ALTA garantizada
        DetalleEvaluacionSaber det = DetalleEvaluacionSaber.builder()
                .evaluacionSaber(es).ejeTematico(eje).valor((short) 1).build();

        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(docenteBCtx());
        when(periodoRepository.findById(PERIODO_ID)).thenReturn(Optional.of(periodo));
        when(seccionRepository.findById(SECCION_B)).thenReturn(Optional.of(seccionB));
        when(matriculaRepository.findBySeccionId(SECCION_B))
                .thenReturn(List.of(Matricula.builder().estudiante(est).seccion(seccionB).build()));
        when(estudianteRepository.findById(EST_ID)).thenReturn(Optional.of(est));
        when(detalleRepository.findByEstudiantePeriodoYSeccion(EST_ID, PERIODO_ID, SECCION_B))
                .thenReturn(List.of(det));
        when(alertaRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<AlertaTematicaResponseDto> result = service.generarAlertasPorSeccion(SECCION_B, PERIODO_ID);

        // Se generó la alerta y queda asociada a la sección de B.
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSeccionId()).isEqualTo(SECCION_B);
        assertThat(result.get(0).getNivelAlerta()).isEqualTo("ALTA");

        // Se leyó SOLO la consulta acotada por sección (nunca la global sin sección).
        verify(detalleRepository).findByEstudiantePeriodoYSeccion(EST_ID, PERIODO_ID, SECCION_B);
        verify(detalleRepository, never()).findByEstudianteAndPeriodo(anyLong(), anyLong());

        // La limpieza apunta a la sección de B (jamás a la de A): no borra alertas de A.
        verify(alertaRepository).eliminarPorEjeMateriaSeccion(EST_ID, PERIODO_ID, EJE_ID, MATERIA_ID, SECCION_B);
        verify(alertaRepository, never())
                .eliminarPorEjeMateriaSeccion(anyLong(), anyLong(), anyInt(), anyInt(), eq(SECCION_A));

        // La entidad persistida lleva la sección de B asignada.
        ArgumentCaptor<List<AlertaTematica>> captor = ArgumentCaptor.forClass(List.class);
        verify(alertaRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).allSatisfy(a ->
                assertThat(a.getSeccion().getId()).isEqualTo(SECCION_B));
    }

    @Test
    void generarAlertasPorEstudiante_exigeSeccion_yLaUsaEnLecturaYLimpieza() {
        Seccion seccionB = Seccion.builder().id(SECCION_B).nombre("B").build();
        Periodo periodo  = Periodo.builder().id(PERIODO_ID).nombre("I Trimestre")
                .numeroPeriodo((short) 1).activo(true).build();
        Estudiante est   = Estudiante.builder().id(EST_ID).identificacion("X1")
                .nombre("Ana").apellido1("Soto").build();

        Materia materia  = Materia.builder().id(MATERIA_ID).clave("MAT").nombre("Matemáticas").build();
        TipoSaber tipo   = TipoSaber.builder().id(1).clave("CONCEPTUAL").nombre("Conceptual").build();
        EjeTematico eje  = EjeTematico.builder().id(EJE_ID).materia(materia).tipoSaber(tipo)
                .clave("MAT_E1").nombre("Números").orden((short) 1).build();
        EvaluacionSaber es = EvaluacionSaber.builder().materia(materia).seccion(seccionB).build();
        DetalleEvaluacionSaber det = DetalleEvaluacionSaber.builder()
                .evaluacionSaber(es).ejeTematico(eje).valor((short) 1).build();

        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(docenteBCtx());
        when(estudianteRepository.findById(EST_ID)).thenReturn(Optional.of(est));
        when(periodoRepository.findById(PERIODO_ID)).thenReturn(Optional.of(periodo));
        when(seccionRepository.findById(SECCION_B)).thenReturn(Optional.of(seccionB));
        when(detalleRepository.findByEstudiantePeriodoYSeccion(EST_ID, PERIODO_ID, SECCION_B))
                .thenReturn(List.of(det));
        when(alertaRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<AlertaTematicaResponseDto> result =
                service.generarAlertasPorEstudiante(EST_ID, PERIODO_ID, SECCION_B);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSeccionId()).isEqualTo(SECCION_B);
        verify(detalleRepository).findByEstudiantePeriodoYSeccion(EST_ID, PERIODO_ID, SECCION_B);
        verify(alertaRepository).eliminarPorEjeMateriaSeccion(EST_ID, PERIODO_ID, EJE_ID, MATERIA_ID, SECCION_B);
    }

    @Test
    void generarAlertasPorSeccion_promedioMedia_generaAlertaMedia() {
        Seccion seccionB = Seccion.builder().id(SECCION_B).nombre("B").build();
        Periodo periodo  = Periodo.builder().id(PERIODO_ID).nombre("I Trimestre")
                .numeroPeriodo((short) 1).activo(true).build();
        Estudiante est   = Estudiante.builder().id(EST_ID).identificacion("X1")
                .nombre("Ana").apellido1("Soto").build();

        Materia materia  = Materia.builder().id(MATERIA_ID).clave("MAT").nombre("Matemáticas").build();
        TipoSaber tipo   = TipoSaber.builder().id(1).clave("CONCEPTUAL").nombre("Conceptual").build();
        EjeTematico eje  = EjeTematico.builder().id(EJE_ID).materia(materia).tipoSaber(tipo)
                .clave("MAT_E1").nombre("Números").orden((short) 1).build();
        EvaluacionSaber es = EvaluacionSaber.builder().materia(materia).seccion(seccionB).build();
        // valor 3 → promedio 3.00 (≤ 3.00) → MEDIA
        DetalleEvaluacionSaber det = DetalleEvaluacionSaber.builder()
                .evaluacionSaber(es).ejeTematico(eje).valor((short) 3).build();

        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(docenteBCtx());
        when(periodoRepository.findById(PERIODO_ID)).thenReturn(Optional.of(periodo));
        when(seccionRepository.findById(SECCION_B)).thenReturn(Optional.of(seccionB));
        when(matriculaRepository.findBySeccionId(SECCION_B))
                .thenReturn(List.of(Matricula.builder().estudiante(est).seccion(seccionB).build()));
        when(estudianteRepository.findById(EST_ID)).thenReturn(Optional.of(est));
        when(detalleRepository.findByEstudiantePeriodoYSeccion(EST_ID, PERIODO_ID, SECCION_B))
                .thenReturn(List.of(det));
        when(alertaRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<AlertaTematicaResponseDto> result = service.generarAlertasPorSeccion(SECCION_B, PERIODO_ID);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getNivelAlerta()).isEqualTo("MEDIA");
        assertThat(result.get(0).getSeccionId()).isEqualTo(SECCION_B);
    }

    @Test
    void generarAlertasPorSeccion_promedioSinAlerta_noGeneraAlertaYLimpia() {
        Seccion seccionB = Seccion.builder().id(SECCION_B).nombre("B").build();
        Periodo periodo  = Periodo.builder().id(PERIODO_ID).nombre("I Trimestre")
                .numeroPeriodo((short) 1).activo(true).build();
        Estudiante est   = Estudiante.builder().id(EST_ID).identificacion("X1")
                .nombre("Ana").apellido1("Soto").build();

        Materia materia  = Materia.builder().id(MATERIA_ID).clave("MAT").nombre("Matemáticas").build();
        TipoSaber tipo   = TipoSaber.builder().id(1).clave("CONCEPTUAL").nombre("Conceptual").build();
        EjeTematico eje  = EjeTematico.builder().id(EJE_ID).materia(materia).tipoSaber(tipo)
                .clave("MAT_E1").nombre("Números").orden((short) 1).build();
        EvaluacionSaber es = EvaluacionSaber.builder().materia(materia).seccion(seccionB).build();
        // valor 4 → promedio 4.00 (> 3.00) → SIN_ALERTA
        DetalleEvaluacionSaber det = DetalleEvaluacionSaber.builder()
                .evaluacionSaber(es).ejeTematico(eje).valor((short) 4).build();

        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(docenteBCtx());
        when(periodoRepository.findById(PERIODO_ID)).thenReturn(Optional.of(periodo));
        when(seccionRepository.findById(SECCION_B)).thenReturn(Optional.of(seccionB));
        when(matriculaRepository.findBySeccionId(SECCION_B))
                .thenReturn(List.of(Matricula.builder().estudiante(est).seccion(seccionB).build()));
        when(estudianteRepository.findById(EST_ID)).thenReturn(Optional.of(est));
        when(detalleRepository.findByEstudiantePeriodoYSeccion(EST_ID, PERIODO_ID, SECCION_B))
                .thenReturn(List.of(det));
        when(alertaRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<AlertaTematicaResponseDto> result = service.generarAlertasPorSeccion(SECCION_B, PERIODO_ID);

        assertThat(result).isEmpty();
        // La limpieza ocurre aunque el nuevo nivel sea SIN_ALERTA (borra alertas previas del eje)
        verify(alertaRepository).eliminarPorEjeMateriaSeccion(EST_ID, PERIODO_ID, EJE_ID, MATERIA_ID, SECCION_B);
        // saveAll se invoca con lista vacía — ninguna alerta persistida
        ArgumentCaptor<List<AlertaTematica>> captor = ArgumentCaptor.forClass(List.class);
        verify(alertaRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).isEmpty();
    }

    @Test
    void generarAlertasPorSeccion_docenteSinAccesoASeccion_lanzaAccesoDenegado() {
        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(docenteBCtx());
        // docenteB solo tiene acceso a SECCION_B (200); intenta operar sobre SECCION_A (100)
        assertThatThrownBy(() -> service.generarAlertasPorSeccion(SECCION_A, PERIODO_ID))
                .isInstanceOf(AccesoDenegadoException.class);

        verify(periodoRepository, never()).findById(anyLong());
        verify(alertaRepository, never()).saveAll(anyList());
    }

    // ── Lectura acotada por sección ─────────────────────────────────────────

    @Test
    void obtenerAlertasPorSeccion_leeSoloPorSeccion_noPorListaDeEstudiantes() {
        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(docenteBCtx());
        when(alertaRepository.findBySeccionIdAndPeriodoId(SECCION_B, PERIODO_ID))
                .thenReturn(List.of());

        List<AlertaTematicaResponseDto> result = service.obtenerAlertasPorSeccion(SECCION_B, PERIODO_ID);

        assertThat(result).isEmpty();
        verify(alertaRepository).findBySeccionIdAndPeriodoId(SECCION_B, PERIODO_ID);
        // La consulta antigua por IN (estudiantes) era la que filtraba la sección: no debe usarse.
        verify(alertaRepository, never()).findByEstudianteIdInAndPeriodoId(anyList(), anyLong());
    }

    @Test
    void obtenerAlertasPorEstudiante_docente_seAcotaASusSecciones() {
        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(docenteBCtx());
        when(alertaRepository.findByEstudianteIdAndPeriodoIdAndSeccionIdIn(
                eq(EST_ID), eq(PERIODO_ID), eq(Set.of(SECCION_B)))).thenReturn(List.of());

        List<AlertaTematicaResponseDto> result = service.obtenerAlertasPorEstudiante(EST_ID, PERIODO_ID);

        assertThat(result).isEmpty();
        verify(contextoUsuarioService).verificarAccesoAlEstudiante(eq(EST_ID), any());
        verify(alertaRepository).findByEstudianteIdAndPeriodoIdAndSeccionIdIn(EST_ID, PERIODO_ID, Set.of(SECCION_B));
        verify(alertaRepository, never()).findByEstudianteIdAndPeriodoId(anyLong(), anyLong());
    }

    @Test
    void obtenerAlertasPorEstudiante_admin_visionGlobal() {
        when(contextoUsuarioService.obtenerContextoActual()).thenReturn(adminCtx());
        when(alertaRepository.findByEstudianteIdAndPeriodoId(EST_ID, PERIODO_ID)).thenReturn(List.of());

        List<AlertaTematicaResponseDto> result = service.obtenerAlertasPorEstudiante(EST_ID, PERIODO_ID);

        assertThat(result).isEmpty();
        verify(alertaRepository).findByEstudianteIdAndPeriodoId(EST_ID, PERIODO_ID);
        verify(alertaRepository, never())
                .findByEstudianteIdAndPeriodoIdAndSeccionIdIn(anyLong(), anyLong(), anyCollection());
    }
}
