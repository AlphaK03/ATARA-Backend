package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.enums.EstadoEstudiante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EstudianteRepository extends JpaRepository<Estudiante, Long> {

    Optional<Estudiante> findByIdentificacion(String identificacion);

    boolean existsByIdentificacion(String identificacion);

    List<Estudiante> findByEstado(EstadoEstudiante estado);

    /**
     * Devuelve los estudiantes matriculados en al menos una de las secciones indicadas.
     * Usado para filtrar la vista de un docente a su alcance asignado.
     */
    @Query("""
        SELECT DISTINCT e FROM Estudiante e
        WHERE e.id IN (
            SELECT m.estudiante.id FROM Matricula m
            WHERE m.seccion.id IN :seccionIds
        )
        ORDER BY e.apellido1, e.nombre
        """)
    List<Estudiante> findBySeccionIds(@Param("seccionIds") Collection<Long> seccionIds);

    /**
     * Catálogo de estudiantes ACTIVOS candidatos a ser matriculados en una sección
     * de un año lectivo. Excluye los que ya tienen matrícula registrada en ese año
     * (regla: un estudiante = una matrícula por año), pero re-incluye los que ya
     * están en {@code seccionIdExcluida} — caso típico del wizard de edición, donde
     * los estudiantes actuales de la sección deben seguir apareciendo seleccionados.
     *
     * @param estado            estado a filtrar (típicamente ACTIVO)
     * @param anioLectivoId     año lectivo objetivo
     * @param seccionIdExcluida sección que se está editando; usar 0 (o cualquier id
     *                          inexistente) en modo creación para no excluir nada
     */
    @Query("""
        SELECT e FROM Estudiante e
        WHERE e.estado = :estado
          AND (
                NOT EXISTS (
                    SELECT 1 FROM Matricula m
                    WHERE m.estudiante.id = e.id
                      AND m.anioLectivo.id = :anioLectivoId
                )
                OR EXISTS (
                    SELECT 1 FROM Matricula m2
                    WHERE m2.estudiante.id = e.id
                      AND m2.seccion.id = :seccionIdExcluida
                )
              )
        ORDER BY e.apellido1, e.apellido2, e.nombre
        """)
    List<Estudiante> findDisponiblesParaMatricula(
            @Param("estado") EstadoEstudiante estado,
            @Param("anioLectivoId") Long anioLectivoId,
            @Param("seccionIdExcluida") Long seccionIdExcluida);

    /** Variante sin filtro por año: lista todos los estudiantes ACTIVOS para el catálogo. */
    List<Estudiante> findByEstadoOrderByApellido1AscApellido2AscNombreAsc(EstadoEstudiante estado);
}
