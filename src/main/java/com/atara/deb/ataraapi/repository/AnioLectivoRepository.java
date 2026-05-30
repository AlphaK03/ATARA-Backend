package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.AnioLectivo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AnioLectivoRepository extends JpaRepository<AnioLectivo, Long> {

    Optional<AnioLectivo> findByActivoTrue();

    Optional<AnioLectivo> findByAnio(Short anio);

    boolean existsByAnio(Short anio);

    List<AnioLectivo> findAllByOrderByAnioDesc();

    // Desactiva todos los años lectivos (usado antes de activar uno nuevo)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE AnioLectivo a SET a.activo = false WHERE a.activo = true")
    void desactivarTodos();

    /**
     * Inserción idempotente del año (hallazgo B-05): si ya existe (uq_anio_lectivo)
     * no hace nada y devuelve 0; si lo inserta, devuelve 1. Evita la condición de
     * carrera de asegurarAnioActual cuando concurren el arranque, el @Scheduled y el
     * endpoint: solo un proceso gana la inserción y el resto reutiliza el año.
     */
    @Modifying
    @Query(value = "INSERT INTO anios_lectivos (anio, activo) VALUES (:anio, FALSE) ON CONFLICT (anio) DO NOTHING",
           nativeQuery = true)
    int insertarSiNoExiste(@Param("anio") short anio);
}
