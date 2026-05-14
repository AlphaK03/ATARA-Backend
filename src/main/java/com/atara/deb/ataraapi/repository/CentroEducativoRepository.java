package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.CentroEducativo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CentroEducativoRepository extends JpaRepository<CentroEducativo, Long> {

    Optional<CentroEducativo> findByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCase(String nombre);
}
