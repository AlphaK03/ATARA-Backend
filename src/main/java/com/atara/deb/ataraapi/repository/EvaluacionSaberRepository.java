package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.EvaluacionSaber;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EvaluacionSaberRepository extends JpaRepository<EvaluacionSaber, Long> {

    List<EvaluacionSaber> findByEstudianteIdAndPeriodoId(Long estudianteId, Long periodoId);

    List<EvaluacionSaber> findByEstudianteId(Long estudianteId);

    List<EvaluacionSaber> findByPeriodoId(Long periodoId);

    List<EvaluacionSaber> findBySeccionIdAndPeriodoId(Long seccionId, Long periodoId);

    boolean existsBySeccionId(Long seccionId);

    List<EvaluacionSaber> findByEstudianteIdAndPeriodoIdAndTipoSaberId(
        Long estudianteId, Long periodoId, Integer tipoSaberId);

    @Query("""
        SELECT DISTINCT es.estudiante.id
        FROM EvaluacionSaber es
        WHERE es.periodo.id = :periodoId AND es.seccion.id = :seccionId
    """)
    List<Long> findEstudianteIdsConEvaluacion(Long periodoId, Long seccionId);

    // Bulk deletes — DB ON DELETE CASCADE handles detalle_evaluacion_saber rows
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM EvaluacionSaber es WHERE es.estudiante.id = :estudianteId")
    void deleteAllByEstudianteId(@Param("estudianteId") Long estudianteId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM EvaluacionSaber es WHERE es.periodo.id = :periodoId")
    void deleteAllByPeriodoId(@Param("periodoId") Long periodoId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM EvaluacionSaber es WHERE es.seccion.id = :seccionId")
    void deleteAllBySeccionId(@Param("seccionId") Long seccionId);
}
