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
     * Catálogo de estudiantes ACTIVOS para el wizard de sección, ordenado por
     * apellidos y nombre. Devuelve a todos los activos: un estudiante puede
     * pertenecer a varias secciones del mismo año (una por docente/materia), por
     * lo que ya no se excluye a los matriculados en otras secciones.
     */
    List<Estudiante> findByEstadoOrderByApellido1AscApellido2AscNombreAsc(EstadoEstudiante estado);
}
