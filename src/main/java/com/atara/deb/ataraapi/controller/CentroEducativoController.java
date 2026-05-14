package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoRequestDto;
import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoResponseDto;
import com.atara.deb.ataraapi.service.CentroEducativoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * CRUD de Centros Educativos para el rol ADMIN.
 *
 * Por política del proyecto NO se expone DELETE: los centros se conservan
 * como histórico permanente para preservar la trazabilidad de secciones
 * y matrículas asociadas.
 */
@RestController
@RequestMapping("/api/admin/centros")
@PreAuthorize("hasRole('ADMIN')")
public class CentroEducativoController {

    private final CentroEducativoService centroService;

    public CentroEducativoController(CentroEducativoService centroService) {
        this.centroService = centroService;
    }

    /** GET /api/admin/centros — lista todos los centros educativos. */
    @GetMapping
    public ResponseEntity<List<CentroEducativoResponseDto>> listar() {
        return ResponseEntity.ok(centroService.listar());
    }

    /** GET /api/admin/centros/{id} — obtiene un centro educativo por id. */
    @GetMapping("/{id}")
    public ResponseEntity<CentroEducativoResponseDto> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(centroService.buscarPorId(id));
    }

    /** POST /api/admin/centros — crea un nuevo centro educativo. */
    @PostMapping
    public ResponseEntity<CentroEducativoResponseDto> crear(
            @Valid @RequestBody CentroEducativoRequestDto dto) {
        CentroEducativoResponseDto creado = centroService.crear(dto);
        return ResponseEntity
                .created(URI.create("/api/admin/centros/" + creado.getId()))
                .body(creado);
    }

    /** PUT /api/admin/centros/{id} — actualiza un centro educativo existente. */
    @PutMapping("/{id}")
    public ResponseEntity<CentroEducativoResponseDto> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody CentroEducativoRequestDto dto) {
        return ResponseEntity.ok(centroService.actualizar(id, dto));
    }
}
