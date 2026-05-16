package com.atara.deb.ataraapi.repository;

import com.atara.deb.ataraapi.model.EmailToken;
import com.atara.deb.ataraapi.model.enums.TipoEmailToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmailTokenRepository extends JpaRepository<EmailToken, Long> {

    Optional<EmailToken> findByTokenHash(String tokenHash);

    /**
     * Invalida (marca como usados) los tokens pendientes de un mismo tipo
     * para un usuario. Útil al emitir un nuevo token: el viejo deja de servir
     * inmediatamente, evitando que queden múltiples códigos válidos en paralelo.
     */
    @Modifying
    @Query("""
        UPDATE EmailToken et
           SET et.usadoEn = CURRENT_TIMESTAMP
         WHERE et.usuario.id = :usuarioId
           AND et.tipo       = :tipo
           AND et.usadoEn   IS NULL
        """)
    int invalidarPendientes(@Param("usuarioId") Long usuarioId,
                            @Param("tipo")      TipoEmailToken tipo);
}
