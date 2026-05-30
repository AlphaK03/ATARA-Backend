package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.AlertaTematica;
import com.atara.deb.ataraapi.model.enums.NivelAlertaTematica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AlertaTematicaRepository extends JpaRepository<AlertaTematica, Long> {

    @Query("""
        SELECT a FROM AlertaTematica a
        JOIN FETCH a.estudiante
        JOIN FETCH a.periodo
        JOIN FETCH a.materia
        JOIN FETCH a.seccion
        JOIN FETCH a.ejeTematico eje
        JOIN FETCH eje.tipoSaber
        WHERE a.estudiante.id = :estudianteId
          AND a.periodo.id = :periodoId
        ORDER BY a.materia.id, eje.tipoSaber.id, eje.orden, a.promedio ASC
    """)
    List<AlertaTematica> findByEstudianteIdAndPeriodoId(Long estudianteId, Long periodoId);

    List<AlertaTematica> findByPeriodoId(Long periodoId);

    @Query("""
        SELECT a FROM AlertaTematica a
        JOIN FETCH a.estudiante
        JOIN FETCH a.periodo
        JOIN FETCH a.materia
        JOIN FETCH a.seccion
        JOIN FETCH a.ejeTematico eje
        JOIN FETCH eje.tipoSaber
        WHERE a.estudiante.id IN :estudianteIds AND a.periodo.id = :periodoId
        ORDER BY a.materia.id, eje.tipoSaber.id, eje.orden, a.nivelAlerta ASC, a.promedio ASC
    """)
    List<AlertaTematica> findByEstudianteIdInAndPeriodoId(List<Long> estudianteIds, Long periodoId);

    /**
     * Lectura ACOTADA por sección: la consulta correcta para la vista por sección.
     * Devuelve solo las alertas generadas en el contexto de esa sección (y por tanto
     * de ese docente), evitando que se muestren las de otra sección/docente sobre los
     * mismos estudiantes (Bug 2).
     */
    @Query("""
        SELECT a FROM AlertaTematica a
        JOIN FETCH a.estudiante
        JOIN FETCH a.periodo
        JOIN FETCH a.materia
        JOIN FETCH a.seccion
        JOIN FETCH a.ejeTematico eje
        JOIN FETCH eje.tipoSaber
        WHERE a.seccion.id = :seccionId AND a.periodo.id = :periodoId
        ORDER BY a.estudiante.id, a.materia.id, eje.tipoSaber.id, eje.orden, a.nivelAlerta ASC, a.promedio ASC
    """)
    List<AlertaTematica> findBySeccionIdAndPeriodoId(Long seccionId, Long periodoId);

    /**
     * Lectura a nivel de estudiante acotada a las secciones del docente autenticado.
     * Para ADMIN/COORDINADOR (visión global) se usa {@link #findByEstudianteIdAndPeriodoId}.
     */
    @Query("""
        SELECT a FROM AlertaTematica a
        JOIN FETCH a.estudiante
        JOIN FETCH a.periodo
        JOIN FETCH a.materia
        JOIN FETCH a.seccion
        JOIN FETCH a.ejeTematico eje
        JOIN FETCH eje.tipoSaber
        WHERE a.estudiante.id = :estudianteId
          AND a.periodo.id = :periodoId
          AND a.seccion.id IN :seccionIds
        ORDER BY a.materia.id, eje.tipoSaber.id, eje.orden, a.promedio ASC
    """)
    List<AlertaTematica> findByEstudianteIdAndPeriodoIdAndSeccionIdIn(
        Long estudianteId, Long periodoId, Collection<Long> seccionIds);

    List<AlertaTematica> findByEstudianteIdAndPeriodoIdAndEjeTematico_IdAndMateriaId(
        Long estudianteId, Long periodoId, Integer ejeTemaaticoId, Integer materiaId);

    Optional<AlertaTematica> findByEstudianteIdAndPeriodoIdAndEjeTematico_IdAndMateriaIdAndNivelAlerta(
        Long estudianteId, Long periodoId, Integer ejeTemaaticoId, Integer materiaId, NivelAlertaTematica nivelAlerta);

    /**
     * Borrado ACOTADO por sección de las alertas previas de un eje/materia para
     * regenerarlas. Es un DELETE bulk (SQL inmediato), de modo que se ejecuta antes
     * de los INSERT de la regeneración y NO viola el índice único
     * {@code (estudiante, periodo, eje, materia, seccion, nivel)}.
     * Incluir {@code seccion_id} es clave: que el docente B regenere NO debe borrar
     * las alertas que el docente A generó sobre el mismo estudiante/eje (Bug 2).
     * {@code flushAutomatically} hace explícito el orden DELETE-antes-de-INSERT.
     */
    @Modifying(flushAutomatically = true)
    @Query("""
        DELETE FROM AlertaTematica a
        WHERE a.estudiante.id = :estudianteId
          AND a.periodo.id = :periodoId
          AND a.ejeTematico.id = :ejeTematicoId
          AND a.materia.id = :materiaId
          AND a.seccion.id = :seccionId
    """)
    void eliminarPorEjeMateriaSeccion(@Param("estudianteId") Long estudianteId,
                                      @Param("periodoId") Long periodoId,
                                      @Param("ejeTematicoId") Integer ejeTematicoId,
                                      @Param("materiaId") Integer materiaId,
                                      @Param("seccionId") Long seccionId);

    void deleteByEstudianteIdAndPeriodoId(Long estudianteId, Long periodoId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM AlertaTematica a WHERE a.estudiante.id = :estudianteId")
    void deleteAllByEstudianteId(@Param("estudianteId") Long estudianteId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM AlertaTematica a WHERE a.periodo.id = :periodoId")
    void deleteAllByPeriodoId(@Param("periodoId") Long periodoId);
}
