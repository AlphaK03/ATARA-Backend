package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.usuario.UsuarioAdminRequestDto;
import com.atara.deb.ataraapi.dto.usuario.UsuarioAdminResponseDto;
import com.atara.deb.ataraapi.service.AdminService;
import com.atara.deb.ataraapi.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final EmailService emailService;

    @Value("${spring.mail.username:#{null}}")
    private String mailUsername;

    public AdminController(AdminService adminService, EmailService emailService) {
        this.adminService = adminService;
        this.emailService = emailService;
    }

    /** GET /api/admin/usuarios — lista todos los usuarios. */
    @GetMapping("/usuarios")
    public ResponseEntity<List<UsuarioAdminResponseDto>> listarUsuarios() {
        return ResponseEntity.ok(adminService.listarUsuarios());
    }

    /** POST /api/admin/usuarios — crea un nuevo usuario. */
    @PostMapping("/usuarios")
    public ResponseEntity<UsuarioAdminResponseDto> crearUsuario(
            @Valid @RequestBody UsuarioAdminRequestDto dto) {
        return ResponseEntity.status(201).body(adminService.crearUsuario(dto));
    }

    /** PUT /api/admin/usuarios/{id} — actualiza un usuario existente. */
    @PutMapping("/usuarios/{id}")
    public ResponseEntity<UsuarioAdminResponseDto> actualizarUsuario(
            @PathVariable Long id,
            @Valid @RequestBody UsuarioAdminRequestDto dto) {
        return ResponseEntity.ok(adminService.actualizarUsuario(id, dto));
    }

    /** DELETE /api/admin/usuarios/{id} — elimina un usuario. */
    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<Void> eliminarUsuario(@PathVariable Long id) {
        adminService.eliminarUsuario(id);
        return ResponseEntity.noContent().build();
    }

    /** PATCH /api/admin/usuarios/{id}/estado — alterna ACTIVO ↔ INACTIVO. */
    @PatchMapping("/usuarios/{id}/estado")
    public ResponseEntity<UsuarioAdminResponseDto> toggleEstado(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.toggleEstado(id));
    }

    /**
     * GET /api/admin/test-mail — envía un correo de prueba al admin autenticado.
     * Endpoint temporal para verificar que el SMTP funciona correctamente.
     */
    @GetMapping("/test-mail")
    public ResponseEntity<Map<String, String>> testMail(Authentication authentication) {
        String destinatario = authentication.getName();
        try {
            emailService.enviarPrueba(destinatario);
            return ResponseEntity.ok(Map.of(
                "status", "ok",
                "mensaje", "Correo de prueba enviado a " + destinatario,
                "remitente", mailUsername != null ? mailUsername : "(no configurado)"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "mensaje", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName(),
                "remitente", mailUsername != null ? mailUsername : "(no configurado)"
            ));
        }
    }
}
