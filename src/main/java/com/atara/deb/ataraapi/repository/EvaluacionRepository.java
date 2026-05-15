package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.Evaluacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EvaluacionRepository extends JpaRepository<Evaluacion, Long> {

    List<Evaluacion> findByEstudianteIdAndPeriodoId(Long estudianteId, Long periodoId);

    List<Evaluacion> findByEstudianteId(Long estudianteId);

    List<Evaluacion> findByPeriodoId(Long periodoId);

    List<Evaluacion> findBySeccionId(Long seccionId);

    boolean existsBySeccionId(Long seccionId);

    // Bulk deletes — DB ON DELETE CASCADE handles detalle_evaluacion rows
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Evaluacion e WHERE e.estudiante.id = :estudianteId")
    void deleteAllByEstudianteId(@Param("estudianteId") Long estudianteId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Evaluacion e WHERE e.periodo.id = :periodoId")
    void deleteAllByPeriodoId(@Param("periodoId") Long periodoId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Evaluacion e WHERE e.seccion.id = :seccionId")
    void deleteAllBySeccionId(@Param("seccionId") Long seccionId);
}