package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.DetalleEvaluacionSaber;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface DetalleEvaluacionSaberRepository extends JpaRepository<DetalleEvaluacionSaber, Long> {

    List<DetalleEvaluacionSaber> findByEvaluacionSaberId(Long evaluacionSaberId);

    @Query("""
        SELECT d FROM DetalleEvaluacionSaber d
        JOIN FETCH d.evaluacionSaber es
        JOIN FETCH es.materia
        JOIN FETCH d.ejeTematico eje
        JOIN FETCH eje.materia
        JOIN FETCH eje.tipoSaber
        WHERE es.estudiante.id = :estudianteId
          AND es.periodo.id = :periodoId
          AND es.materia.id = eje.materia.id
        ORDER BY es.materia.id, eje.tipoSaber.id, eje.orden
    """)
    List<DetalleEvaluacionSaber> findByEstudianteAndPeriodo(Long estudianteId, Long periodoId);

    /**
     * Detalles del estudiante en el periodo ACOTADOS a una sección concreta.
     * Es la consulta correcta para las vistas por sección: como un estudiante puede
     * estar en varias secciones del mismo año (una por docente), filtrar por
     * {@code es.seccion.id} evita que las evaluaciones de un docente se "cuelen" en
     * la vista de otro (Bug 2 — fuga de datos entre docentes).
     */
    @Query("""
        SELECT d FROM DetalleEvaluacionSaber d
        JOIN FETCH d.evaluacionSaber es
        JOIN FETCH es.materia
        JOIN FETCH d.ejeTematico eje
        JOIN FETCH eje.materia
        JOIN FETCH eje.tipoSaber
        WHERE es.estudiante.id = :estudianteId
          AND es.periodo.id = :periodoId
          AND es.seccion.id = :seccionId
          AND es.materia.id = eje.materia.id
        ORDER BY es.materia.id, eje.tipoSaber.id, eje.orden
    """)
    List<DetalleEvaluacionSaber> findByEstudiantePeriodoYSeccion(Long estudianteId, Long periodoId, Long seccionId);

    /**
     * Variante para endpoints a nivel de estudiante (sin sección explícita):
     * acota los detalles a las secciones del docente autenticado, de modo que un
     * docente nunca agrega evaluaciones de secciones que no le pertenecen.
     */
    @Query("""
        SELECT d FROM DetalleEvaluacionSaber d
        JOIN FETCH d.evaluacionSaber es
        JOIN FETCH es.materia
        JOIN FETCH d.ejeTematico eje
        JOIN FETCH eje.materia
        JOIN FETCH eje.tipoSaber
        WHERE es.estudiante.id = :estudianteId
          AND es.periodo.id = :periodoId
          AND es.seccion.id IN :seccionIds
          AND es.materia.id = eje.materia.id
        ORDER BY es.materia.id, eje.tipoSaber.id, eje.orden
    """)
    List<DetalleEvaluacionSaber> findByEstudiantePeriodoYSecciones(
        Long estudianteId, Long periodoId, Collection<Long> seccionIds);

    @Query("""
        SELECT d FROM DetalleEvaluacionSaber d
        JOIN FETCH d.evaluacionSaber es
        JOIN FETCH es.materia
        JOIN FETCH d.ejeTematico eje
        JOIN FETCH eje.materia
        JOIN FETCH eje.tipoSaber
        WHERE es.estudiante.id = :estudianteId
          AND es.periodo.id = :periodoId
          AND eje.id = :ejeTematicoId
          AND es.materia.id = eje.materia.id
    """)
    List<DetalleEvaluacionSaber> findByEstudiantePeriodoAndEje(
        Long estudianteId, Long periodoId, Integer ejeTematicoId);
}
