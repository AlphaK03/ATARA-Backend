package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.Seccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SeccionRepository extends JpaRepository<Seccion, Long> {

    List<Seccion> findByAnioLectivoId(Long anioLectivoId);

    List<Seccion> findByDocenteId(Long docenteId);

    /**
     * Secciones de un año lectivo accesibles para un usuario:
     *  - donde es docente titular (secciones.docente_id), o
     *  - donde está vinculado vía usuarios_secciones.
     * Sin duplicados (DISTINCT).
     */
    @Query(value = """
        SELECT DISTINCT s.* FROM secciones s
        LEFT JOIN usuarios_secciones us ON us.seccion_id = s.id
        WHERE s.anio_lectivo_id = :anioLectivoId
          AND (s.docente_id = :usuarioId OR us.usuario_id = :usuarioId)
        """, nativeQuery = true)
    List<Seccion> findByAnioLectivoIdAndAccesibleParaUsuario(
            @Param("anioLectivoId") Long anioLectivoId,
            @Param("usuarioId") Long usuarioId);
}
