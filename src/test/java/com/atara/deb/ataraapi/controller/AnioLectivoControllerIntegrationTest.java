package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.model.Periodo;
import com.atara.deb.ataraapi.repository.AnioLectivoRepository;
import com.atara.deb.ataraapi.repository.PeriodoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.Year;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Prueba de integración del endpoint {@code POST /api/anios-lectivos/asegurar-actual}.
 *
 * <p>Verifica la matriz de seguridad ({@code @PreAuthorize("hasRole('ADMIN')")}) más
 * el efecto real sobre la base de datos. Se ejecuta {@code @Transactional} para que
 * todos los cambios (incluida la creación del año en curso) se reviertan al final y
 * no contaminen la BD de desarrollo.
 *
 * <p>Se mockea el {@code JavaMailSender} para que el contexto arranque sin depender
 * de un servidor SMTP.
 */
@SpringBootTest
@Transactional
class AnioLectivoControllerIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired AnioLectivoRepository anioLectivoRepository;
    @Autowired PeriodoRepository periodoRepository;

    @MockitoBean org.springframework.mail.javamail.JavaMailSender javaMailSender;

    private MockMvc mockMvc;

    private static final short ANIO_ACTUAL =
            (short) Year.now(ZoneId.of("America/Costa_Rica")).getValue();

    @BeforeEach
    void setUp() {
        // Spring Boot 4 separó el slice @AutoConfigureMockMvc en un módulo aparte
        // que no arrastra spring-boot-starter-test; construimos el MockMvc a mano
        // sobre el contexto web aplicando la cadena de filtros de Spring Security.
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    @WithAnonymousUser
    void asegurarActual_sinToken_devuelve401() throws Exception {
        mockMvc.perform(post("/api/anios-lectivos/asegurar-actual"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "DOCENTE")
    void asegurarActual_noAdmin_devuelve403() throws Exception {
        mockMvc.perform(post("/api/anios-lectivos/asegurar-actual"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void asegurarActual_admin_devuelve200YCreaAnioConTrimestres() throws Exception {
        mockMvc.perform(post("/api/anios-lectivos/asegurar-actual"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anio").value((int) ANIO_ACTUAL))
                .andExpect(jsonPath("$.activo").value(true));

        Optional<AnioLectivo> creado = anioLectivoRepository.findByAnio(ANIO_ACTUAL);
        assertThat(creado).isPresent();
        assertThat(creado.get().getActivo()).isTrue();

        List<Periodo> trimestres = periodoRepository.findByAnioLectivoId(creado.get().getId());
        assertThat(trimestres).hasSize(3);
        assertThat(trimestres).extracting(Periodo::getNumeroPeriodo)
                .containsExactlyInAnyOrder((short) 1, (short) 2, (short) 3);
    }
}
