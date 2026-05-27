package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.usuario.UsuarioAdminRequestDto;
import com.atara.deb.ataraapi.dto.usuario.UsuarioAdminResponseDto;
import com.atara.deb.ataraapi.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
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
}
