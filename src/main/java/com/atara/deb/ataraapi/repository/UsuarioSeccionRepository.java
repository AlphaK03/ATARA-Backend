package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.UsuarioSeccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UsuarioSeccionRepository extends JpaRepository<UsuarioSeccion, Long> {

    List<UsuarioSeccion> findBySeccionId(Long seccionId);

    List<UsuarioSeccion> findByUsuarioId(Long usuarioId);

    boolean existsByUsuarioIdAndSeccionId(Long usuarioId, Long seccionId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM UsuarioSeccion us WHERE us.seccion.id = :seccionId")
    void deleteAllBySeccionId(@Param("seccionId") Long seccionId);
}
