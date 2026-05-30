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
     * Token pendiente (no usado) más reciente de un usuario para un tipo dado.
     * Usado en el flujo de reset para localizar el token POR USUARIO y poder
     * contabilizar los intentos fallidos contra él (en vez de buscar por el hash
     * del código, que no permitía aplicar el límite de intentos).
     */
    Optional<EmailToken> findTopByUsuarioIdAndTipoAndUsadoEnIsNullOrderByIdDesc(
            Long usuarioId, TipoEmailToken tipo);

    /** Invalida todos los tokens pendientes del mismo tipo para un usuario (evita tokens huérfanos). */
    @Modifying
    @Query("UPDATE EmailToken t SET t.usadoEn = CURRENT_TIMESTAMP " +
           "WHERE t.usuario.id = :usuarioId AND t.tipo = :tipo AND t.usadoEn IS NULL")
    void invalidarPendientesPorUsuario(@Param("usuarioId") Long usuarioId,
                                       @Param("tipo") TipoEmailToken tipo);
}
