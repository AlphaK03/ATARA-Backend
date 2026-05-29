package com.atara.deb.ataraapi.exception;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import com.atara.deb.ataraapi.exception.AccesoDenegadoException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // -------------------------------------------------------------------------
    // Autenticación y autorización
    // -------------------------------------------------------------------------

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos.", req);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, Object>> handleDisabled(DisabledException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.FORBIDDEN, "La cuenta de usuario está inactiva.", req);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "No autenticado: " + ex.getMessage(), req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.FORBIDDEN, "No tiene permisos para acceder a este recurso.", req);
    }

    @ExceptionHandler(AccesoDenegadoException.class)
    public ResponseEntity<Map<String, Object>> handleAccesoDenegado(AccesoDenegadoException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage(), req);
    }

    @ExceptionHandler(TokenRefreshException.class)
    public ResponseEntity<Map<String, Object>> handleTokenRefresh(TokenRefreshException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage(), req);
    }

    // -------------------------------------------------------------------------
    // Validación de entrada
    // -------------------------------------------------------------------------

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        String mensaje = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return buildResponse(HttpStatus.BAD_REQUEST, mensaje, req);
    }

    /**
     * Errores al leer el body del request — JSON mal formado, fecha inválida,
     * o un valor que no encaja con un enum (ej. "MASCULINO" para un enum {M,F,O}).
     * Antes caían en el handler genérico de RuntimeException y devolvían 500;
     * ahora devuelven 400 con un mensaje útil que indica el campo problemático.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest req) {
        Throwable cause = ex.getCause();
        if (cause instanceof InvalidFormatException ife) {
            String campo = ife.getPath().isEmpty()
                    ? "(desconocido)"
                    : ife.getPath().get(ife.getPath().size() - 1).getFieldName();
            String tipo = ife.getTargetType() != null
                    ? ife.getTargetType().getSimpleName()
                    : "tipo esperado";
            String valor = String.valueOf(ife.getValue());
            String permitidos = "";
            if (ife.getTargetType() != null && ife.getTargetType().isEnum()) {
                Object[] consts = ife.getTargetType().getEnumConstants();
                if (consts != null) {
                    permitidos = " — valores permitidos: " + java.util.Arrays.toString(consts);
                }
            }
            String mensaje = "Valor inválido para el campo '" + campo + "': '"
                    + valor + "' no es un " + tipo + " válido" + permitidos + ".";
            return buildResponse(HttpStatus.BAD_REQUEST, mensaje, req);
        }
        return buildResponse(HttpStatus.BAD_REQUEST,
                "El cuerpo de la petición no se pudo procesar: " + ex.getMostSpecificCause().getMessage(),
                req);
    }

    // -------------------------------------------------------------------------
    // Errores generales de negocio
    // -------------------------------------------------------------------------

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<Map<String, Object>> handleNotImplemented(UnsupportedOperationException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.NOT_IMPLEMENTED, ex.getMessage(), req);
    }

    /**
     * Errores de configuración/estado del servidor cuyo mensaje SÍ es seguro y útil
     * mostrar al cliente (no contiene PII ni detalles internos sensibles). Ejemplo:
     * el OCR de PIAD no encuentra el modelo de idioma 'spa.traineddata'. Se devuelve
     * 500 con el mensaje accionable en vez del genérico para facilitar el diagnóstico.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage() != null ? ex.getMessage() : "Error interno del servidor.", req);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex, HttpServletRequest req) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor.", req);
    }

    // -------------------------------------------------------------------------

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message, HttpServletRequest req) {
        return ResponseEntity.status(status).body(Map.of(
            "timestamp", OffsetDateTime.now().toString(),
            "status",    status.value(),
            "error",     status.getReasonPhrase(),
            "message",   message != null ? message : "",
            "path",      req.getRequestURI()
        ));
    }
}
