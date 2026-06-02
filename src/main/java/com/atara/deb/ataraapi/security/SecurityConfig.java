package com.atara.deb.ataraapi.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;

    /**
     * Orígenes permitidos para CORS (lista separada por comas). En producción debe
     * fijarse al dominio real del frontend mediante CORS_ALLOWED_ORIGINS; el valor
     * "*" solo es razonable en desarrollo.
     */
    @Value("${cors.allowed-origin-patterns:*}")
    private String allowedOriginPatterns;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter,
                          UserDetailsServiceImpl userDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/login",
                                     "/api/auth/registro",
                                     "/api/auth/refresh",
                                     "/api/auth/logout",
                                     "/api/auth/password-reset/solicitar",
                                     "/api/auth/password-reset/confirmar",
                                     "/api/auth/email/verificar").permitAll()
                    .requestMatchers("/actuator/health").permitAll()
                    // El forward interno a /error NO debe exigir autenticación. Spring
                    // re-despacha aquí cualquier 404/500; como JwtAuthenticationFilter es
                    // un OncePerRequestFilter que se salta el dispatch de ERROR, el
                    // SecurityContext queda anónimo y, sin este permitAll, el error real
                    // se enmascararía como 401 (cerrando la sesión del cliente). Permitirlo
                    // deja que el cliente reciba el status verdadero (404/500).
                    .requestMatchers("/error").permitAll()
                    .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, authException) -> {
                        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        res.setCharacterEncoding("UTF-8");
                        res.getWriter().write(
                                "{\"status\":401,\"error\":\"No autorizado\"," +
                                "\"message\":\"Token de acceso requerido o inválido\"}");
                    })
                    .accessDeniedHandler((req, res, accessDeniedException) -> {
                        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        res.setCharacterEncoding("UTF-8");
                        res.getWriter().write(
                                "{\"status\":403,\"error\":\"Acceso denegado\"," +
                                "\"message\":\"No tiene permisos para acceder a este recurso\"}");
                    })
            );

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        // Oculta "usuario no encontrado": un correo inexistente produce el mismo
        // BadCredentialsException que una contraseña incorrecta, evitando la
        // enumeración de cuentas en el login (hallazgo M-04).
        provider.setHideUserNotFoundExceptions(true);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Strength 12 exigido por la política del proyecto (hallazgo B-01). BCrypt guarda el
        // cost en el propio hash, por lo que sigue verificando hashes previos de cost 10.
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Orígenes tomados de la propiedad (configurable por entorno), ya no fijo a "*".
        config.setAllowedOriginPatterns(
                Arrays.stream(allowedOriginPatterns.split(","))
                        .map(String::trim)
                        .filter(o -> !o.isEmpty())
                        .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        // La API es stateless con token Bearer en el header (no usa cookies de sesión),
        // por lo que NO se permiten credenciales: elimina la combinación insegura
        // "*" + allowCredentials(true) (hallazgo M-01).
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
