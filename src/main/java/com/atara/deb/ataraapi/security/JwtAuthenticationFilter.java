package com.atara.deb.ataraapi.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro que intercepta cada request, extrae el Bearer token del header Authorization,
 * lo valida y establece la autenticación en el SecurityContext.
 *
 * Si el token no está presente, es inválido o expirado, el filtro deja pasar el request
 * sin autenticación — Spring Security se encargará de rechazarlo si el endpoint lo requiere.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   UserDetailsServiceImpl userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // Sin Bearer: si el endpoint es protegido, Spring devolverá 401. Lo
            // registramos a DEBUG para distinguir "no llegó token" de "token rechazado"
            // al diagnosticar 401 (p. ej. en POST /api/piad/extraer).
            if (log.isDebugEnabled()) {
                log.debug("Request {} {} sin header 'Authorization: Bearer' — quedará sin autenticar",
                        request.getMethod(), request.getRequestURI());
            }
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            String correo = jwtService.extraerCorreo(token);

            // Solo autenticar si hay correo y aún no hay autenticación en el contexto
            if (correo != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(correo);

                if (jwtService.esTokenValido(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else if (log.isDebugEnabled()) {
                    // El token parsea y verifica firma, pero el subject no coincide
                    // con el UserDetails cargado. No se loguea el correo (PII).
                    log.debug("Token RECHAZADO en {} {}: subject no coincide con el usuario cargado",
                            request.getMethod(), request.getRequestURI());
                }
            }
        } catch (ExpiredJwtException e) {
            // Token bien firmado pero expirado (más allá de la tolerancia de clock-skew).
            // exp no es PII: ayuda a confirmar la hipótesis "expiró antes de extraer".
            log.debug("Token EXPIRADO en {} {} (exp={}) — el cliente debe refrescar",
                    request.getMethod(), request.getRequestURI(), e.getClaims().getExpiration());
        } catch (JwtException | IllegalArgumentException e) {
            // Firma inválida (¿secreto distinto entre emisión y validación?),
            // token malformado o vacío. Se loguea SOLO la clase, nunca el token.
            log.debug("Token INVÁLIDO en {} {}: {}",
                    request.getMethod(), request.getRequestURI(), e.getClass().getSimpleName());
        }

        filterChain.doFilter(request, response);
    }
}
