package com.atara.deb.ataraapi.model;

import com.atara.deb.ataraapi.model.enums.TipoEmailToken;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/**
 * Token de un solo uso para flujos basados en correo:
 *   - VERIFICACION_EMAIL: link que confirma que el correo existe
 *   - RESET_PASSWORD: código numérico para restablecer contraseña olvidada
 *
 * <p>{@code tokenHash} guarda el SHA-256 del valor enviado por correo. Nunca
 * persistimos el valor crudo — mismo patrón que {@code TokenRefresh}.
 *
 * <p>Un token se considera válido si: {@code usadoEn IS NULL} AND
 * {@code expiraEn > NOW()}. Tras redimirlo se marca {@code usadoEn} para
 * impedir reusarlo.
 */
@Entity
@Table(name = "email_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 30)
    private TipoEmailToken tipo;

    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    @Column(name = "expira_en", nullable = false)
    private OffsetDateTime expiraEn;

    @Column(name = "usado_en")
    private OffsetDateTime usadoEn;

    /**
     * Validaciones fallidas. Para RESET_PASSWORD, tras 5 fallos el token
     * se invalida (se marca como usado) para limitar el brute-force del
     * código corto. Ver V15.
     */
    @Builder.Default
    @Column(name = "intentos", nullable = false)
    private Integer intentos = 0;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;
}
