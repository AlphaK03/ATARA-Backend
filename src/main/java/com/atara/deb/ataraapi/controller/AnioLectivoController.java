package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.aniolectivo.AnioLectivoRequestDto;
import com.atara.deb.ataraapi.dto.aniolectivo.AnioLectivoResponseDto;
import com.atara.deb.ataraapi.model.AnioLectivo;
import com.atara.deb.ataraapi.service.AnioLectivoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/anios-lectivos")
public class AnioLectivoController {

    private final AnioLectivoService anioLectivoService;

    public AnioLectivoController(AnioLectivoService anioLectivoService) {
        this.anioLectivoService = anioLectivoService;
    }

    @PostMapping
    public ResponseEntity<AnioLectivoResponseDto> crear(@Valid @RequestBody AnioLectivoRequestDto request) {
        AnioLectivo anioLectivo = toEntity(request);
        AnioLectivo creado = anioLectivoService.crear(anioLectivo);
        return ResponseEntity
                .created(URI.create("/api/anios-lectivos/" + creado.getId()))
                .body(toResponse(creado));
    }

    /**
     * Asegura que el año lectivo del año natural en curso exista (creándolo
     * junto con sus 3 trimestres y activándolo si hace falta). Operación
     * idempotente: si ya existe, lo devuelve sin cambios. Solo ADMIN.
     */
    @PostMapping("/asegurar-actual")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AnioLectivoResponseDto> asegurarActual() {
        AnioLectivo anio = anioLectivoService.asegurarAnioActual();
        return ResponseEntity.ok(toResponse(anio));
    }

    @GetMapping
    public ResponseEntity<List<AnioLectivoResponseDto>> listar() {
        List<AnioLectivoResponseDto> lista = anioLectivoService.listarTodos()
                .stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/activo")
    public ResponseEntity<AnioLectivoResponseDto> obtenerActivo() {
        return anioLectivoService.obtenerActivo()
                .map(a -> ResponseEntity.ok(toResponse(a)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnioLectivoResponseDto> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(anioLectivoService.buscarPorId(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AnioLectivoResponseDto> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody AnioLectivoRequestDto request) {
        AnioLectivo actualizado = anioLectivoService.actualizar(id, request);
        return ResponseEntity.ok(toResponse(actualizado));
    }

    @PutMapping("/{id}/activar")
    public ResponseEntity<AnioLectivoResponseDto> activar(@PathVariable Long id) {
        AnioLectivo activado = anioLectivoService.activar(id);
        return ResponseEntity.ok(toResponse(activado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        anioLectivoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // --- Mapeo ---

    private AnioLectivo toEntity(AnioLectivoRequestDto dto) {
        AnioLectivo a = new AnioLectivo();
        a.setAnio(dto.getAnio());
        return a;
    }

    private AnioLectivoResponseDto toResponse(AnioLectivo a) {
        AnioLectivoResponseDto dto = new AnioLectivoResponseDto();
        dto.setId(a.getId());
        dto.setAnio(a.getAnio());
        dto.setActivo(a.getActivo());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setUpdatedAt(a.getUpdatedAt());
        return dto;
    }
}
