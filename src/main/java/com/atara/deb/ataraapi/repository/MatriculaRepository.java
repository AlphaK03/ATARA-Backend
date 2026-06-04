package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.Matricula;
import com.atara.deb.ataraapi.model.enums.EstadoMatricula;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatriculaRepository extends JpaRepository<Matricula, Long> {

    /** JOIN FETCH de estudiante, sección y año lectivo para evitar el N+1 al mapear el DTO (hallazgo B-04). */
    @Query("SELECT m FROM Matricula m JOIN FETCH m.estudiante JOIN FETCH m.seccion JOIN FETCH m.anioLectivo WHERE m.estudiante.id = :estudianteId")
    List<Matricula> findByEstudianteId(@Param("estudianteId") Long estudianteId);

    @Query("SELECT m FROM Matricula m JOIN FETCH m.estudiante WHERE m.seccion.id = :seccionId")
    List<Matricula> findBySeccionId(@Param("seccionId") Long seccionId);

    List<Matricula> findByAnioLectivoId(Long anioLectivoId);

    Optional<Matricula> findByEstudianteIdAndAnioLectivoId(Long estudianteId, Long anioLectivoId);

    boolean existsByEstudianteIdAndAnioLectivoId(Long estudianteId, Long anioLectivoId);

    /**
     * Matrícula del estudiante en un año lectivo filtrada por estado. Se usa para
     * hacer cumplir la regla "un estudiante = una sección ACTIVA por año": antes de
     * matricular se busca si ya tiene una matrícula ACTIVO en ese año (en cualquier
     * otra sección) y, de ser así, se rechaza.
     */
    Optional<Matricula> findByEstudianteIdAndAnioLectivoIdAndEstado(
            Long estudianteId, Long anioLectivoId, EstadoMatricula estado);

    /**
     * IDs de estudiantes con matrícula en un estado dado para un año lectivo.
     * Alimenta el filtro del catálogo del wizard: los que ya tienen matrícula ACTIVO
     * en el año no se ofrecen para una sección nueva (salvo modo edición de su sección).
     */
    @Query("SELECT m.estudiante.id FROM Matricula m WHERE m.anioLectivo.id = :anioLectivoId AND m.estado = :estado")
    List<Long> findEstudianteIdsByAnioLectivoIdAndEstado(
            @Param("anioLectivoId") Long anioLectivoId, @Param("estado") EstadoMatricula estado);

    /**
     * True si el estudiante ya está matriculado en esa sección concreta.
     * Guarda la unicidad (estudiante_id, seccion_id): un estudiante puede estar
     * en varias secciones del año, pero no dos veces en la misma.
     */
    boolean existsByEstudianteIdAndSeccionId(Long estudianteId, Long seccionId);

    /**
     * Matrícula existente (en cualquier estado) del estudiante en una sección.
     * Permite reactivar una matrícula RETIRADO en vez de insertar una nueva fila,
     * que chocaría con UNIQUE (estudiante_id, seccion_id).
     */
    Optional<Matricula> findByEstudianteIdAndSeccionId(Long estudianteId, Long seccionId);

    /** True si el estudiante tiene matrícula en alguna de las secciones indicadas. */
    boolean existsByEstudianteIdAndSeccionIdIn(Long estudianteId, java.util.Collection<Long> seccionIds);

    /** True si la sección tiene al menos una matrícula (cualquier estado). */
    boolean existsBySeccionId(Long seccionId);

    /** Número de matrículas activas en una sección. */
    int countBySeccionIdAndEstado(Long seccionId, EstadoMatricula estado);

    /** Matrículas en una sección filtradas por estado, con FETCH del estudiante para evitar N+1. */
    @Query("SELECT m FROM Matricula m JOIN FETCH m.estudiante WHERE m.seccion.id = :seccionId AND m.estado = :estado")
    List<Matricula> findBySeccionIdAndEstado(@Param("seccionId") Long seccionId, @Param("estado") EstadoMatricula estado);

    List<Matricula> findByEstudianteIdAndEstado(Long estudianteId, EstadoMatricula estado);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Matricula m WHERE m.estudiante.id = :estudianteId")
    void deleteAllByEstudianteId(@Param("estudianteId") Long estudianteId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Matricula m WHERE m.seccion.id = :seccionId")
    void deleteAllBySeccionId(@Param("seccionId") Long seccionId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Matricula m WHERE m.anioLectivo.id = :anioLectivoId")
    void deleteAllByAnioLectivoId(@Param("anioLectivoId") Long anioLectivoId);
}
