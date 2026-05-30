package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.periodo.PeriodoRequestDto;
import com.atara.deb.ataraapi.dto.periodo.PeriodoResponseDto;
import com.atara.deb.ataraapi.service.PeriodoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/periodos")
public class PeriodoController {

    private final PeriodoService periodoService;

    public PeriodoController(PeriodoService periodoService) {
        this.periodoService = periodoService;
    }

    /** POST /api/periodos — crea un nuevo periodo en el año lectivo indicado. Solo ADMIN. */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponseDto> crear(@Valid @RequestBody PeriodoRequestDto dto) {
        return ResponseEntity.ok(periodoService.crear(dto));
    }

    /** GET /api/periodos?anioLectivoId=1 — lista todos los periodos de un año lectivo. */
    @GetMapping
    public ResponseEntity<List<PeriodoResponseDto>> listar(
            @RequestParam Long anioLectivoId) {
        return ResponseEntity.ok(periodoService.listarPorAnioLectivo(anioLectivoId));
    }

    /** GET /api/periodos/activo?anioLectivoId=1 — periodo activo de un año lectivo. */
    @GetMapping("/activo")
    public ResponseEntity<PeriodoResponseDto> obtenerActivo(
            @RequestParam Long anioLectivoId) {
        return periodoService.obtenerActivo(anioLectivoId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** PUT /api/periodos/{id} — actualiza nombre y fechas de un periodo. Solo ADMIN. */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponseDto> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody PeriodoRequestDto dto) {
        return ResponseEntity.ok(periodoService.actualizar(id, dto));
    }

    /** PUT /api/periodos/{id}/activar — activa un periodo (desactiva los demás del mismo año). Solo ADMIN. */
    @PutMapping("/{id}/activar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PeriodoResponseDto> activar(@PathVariable Long id) {
        return ResponseEntity.ok(periodoService.activar(id));
    }

    /** DELETE /api/periodos/{id} — elimina el periodo y sus evaluaciones y alertas. Solo ADMIN. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        periodoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
