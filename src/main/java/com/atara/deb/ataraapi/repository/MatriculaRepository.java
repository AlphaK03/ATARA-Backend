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

    List<Matricula> findByEstudianteId(Long estudianteId);

    @Query("SELECT m FROM Matricula m JOIN FETCH m.estudiante WHERE m.seccion.id = :seccionId")
    List<Matricula> findBySeccionId(@Param("seccionId") Long seccionId);

    List<Matricula> findByAnioLectivoId(Long anioLectivoId);

    Optional<Matricula> findByEstudianteIdAndAnioLectivoId(Long estudianteId, Long anioLectivoId);

    boolean existsByEstudianteIdAndAnioLectivoId(Long estudianteId, Long anioLectivoId);

    /**
     * True si el estudiante ya está matriculado en esa sección concreta.
     * Guarda la unicidad (estudiante_id, seccion_id): un estudiante puede estar
     * en varias secciones del año, pero no dos veces en la misma.
     */
    boolean existsByEstudianteIdAndSeccionId(Long estudianteId, Long seccionId);

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
