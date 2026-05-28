package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.EjeTematico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EjeTemaaticoRepository extends JpaRepository<EjeTematico, Integer> {
    List<EjeTematico> findByTipoSaberIdOrderByOrden(Integer tipoSaberId);
    List<EjeTematico> findAllByOrderByTipoSaberIdAscOrdenAsc();
    List<EjeTematico> findByMateriaIdAndTipoSaberIdOrderByOrden(Integer materiaId, Integer tipoSaberId);
    List<EjeTematico> findByMateriaIdOrderByTipoSaberIdAscOrdenAsc(Integer materiaId);

    /**
     * Ejes asociados a un nivel educativo concreto vía la tabla puente
     * {@code ejes_tematicos_niveles} (V12). Permite filtrar opcionalmente por
     * materia, tipo de saber y/o trimestre (periodoNumero). Si los parámetros
     * opcionales vienen en {@code null}, el filtro se ignora.
     *
     * Para periodoNumero: cuando se proporciona, devuelve los ejes con ese
     * periodo_numero exacto MÁS los ejes con periodo_numero IS NULL
     * (transversales — aplicables a cualquier trimestre).
     */
    @Query("""
        SELECT e FROM EjeTematico e
        WHERE EXISTS (
            SELECT 1 FROM EjeTematicoNivel en
            WHERE en.ejeTematico.id = e.id
              AND en.nivel.id = :nivelId
        )
          AND (:materiaId      IS NULL OR e.materia.id      = :materiaId)
          AND (:tipoSaberId    IS NULL OR e.tipoSaber.id    = :tipoSaberId)
          AND (:periodoNumero  IS NULL OR e.periodoNumero   = :periodoNumero OR e.periodoNumero IS NULL)
        ORDER BY e.tipoSaber.id ASC, e.orden ASC
        """)
    List<EjeTematico> findByNivelOptMateriaOptTipoSaber(
            @Param("nivelId")        Long    nivelId,
            @Param("materiaId")      Integer materiaId,
            @Param("tipoSaberId")    Integer tipoSaberId,
            @Param("periodoNumero")  Short   periodoNumero);
}
