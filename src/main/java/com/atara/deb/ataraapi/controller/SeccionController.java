package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoResponseDto;
import com.atara.deb.ataraapi.dto.catalogo.NivelResponseDto;
import com.atara.deb.ataraapi.dto.seccion.SeccionRequestDto;
import com.atara.deb.ataraapi.dto.seccion.SeccionResponseDto;
import com.atara.deb.ataraapi.dto.usuario.UsuarioDocenteResponseDto;
import com.atara.deb.ataraapi.service.SeccionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

import java.util.List;

@RestController
@RequestMapping("/api/secciones")
public class SeccionController {

    private final SeccionService seccionService;

    public SeccionController(SeccionService seccionService) {
        this.seccionService = seccionService;
    }

    /**
     * GET /api/secciones?anioLectivoId=1 — Lista las secciones del año lectivo
     * filtradas según el rol del usuario autenticado:
     *   - ADMIN: todas las secciones del año.
     *   - DOCENTE: solo donde es titular o está asignado vía usuarios_secciones.
     *   - Otros roles: 403.
     */
    @GetMapping
    public ResponseEntity<List<SeccionResponseDto>> listar(
            @RequestParam Long anioLectivoId) {
        return ResponseEntity.ok(seccionService.listarPorAnioLectivo(anioLectivoId));
    }

    /** GET /api/secciones/{id} — obtiene una sección por id. */
    @GetMapping("/{id}")
    public ResponseEntity<SeccionResponseDto> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(seccionService.buscarPorId(id));
    }

    /**
     * GET /api/secciones/docente/{docenteId} — secciones asignadas a un docente arbitrario.
     * Solo ADMIN: usar para vistas administrativas. Un docente debe usar GET /api/secciones
     * para ver únicamente las suyas (filtrado automático por su identidad).
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/docente/{docenteId}")
    public ResponseEntity<List<SeccionResponseDto>> listarPorDocente(
            @PathVariable Long docenteId) {
        return ResponseEntity.ok(seccionService.listarPorDocente(docenteId));
    }

    /**
     * POST /api/secciones — crea una nueva sección.
     * Permitido a ADMIN y DOCENTE. Si lo crea un DOCENTE:
     *   - Él queda como titular automáticamente (el campo docenteId del DTO se ignora).
     *   - Se autoincluye en usuarios_secciones junto a los docentesAdicionalesIds.
     * En la misma transacción se crean las matrículas ACTIVAS para los estudiantesIds.
     */
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    @PostMapping
    public ResponseEntity<SeccionResponseDto> crear(@Valid @RequestBody SeccionRequestDto dto) {
        SeccionResponseDto creada = seccionService.crearSeccion(dto);
        return ResponseEntity
                .created(URI.create("/api/secciones/" + creada.getId()))
                .body(creada);
    }

    /** GET /api/secciones/catalogos/niveles — niveles educativos disponibles. */
    @GetMapping("/catalogos/niveles")
    public ResponseEntity<List<NivelResponseDto>> listarNiveles() {
        return ResponseEntity.ok(seccionService.listarNiveles());
    }

    /** GET /api/secciones/catalogos/centros — centros educativos disponibles. */
    @GetMapping("/catalogos/centros")
    public ResponseEntity<List<CentroEducativoResponseDto>> listarCentros() {
        return ResponseEntity.ok(seccionService.listarCentros());
    }

    /** GET /api/secciones/catalogos/docentes — docentes activos disponibles. */
    @GetMapping("/catalogos/docentes")
    public ResponseEntity<List<UsuarioDocenteResponseDto>> listarDocentes() {
        return ResponseEntity.ok(seccionService.listarDocentes());
    }

    /** PUT /api/secciones/{id} — actualiza los datos de una sección. */
    @PutMapping("/{id}")
    public ResponseEntity<SeccionResponseDto> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody SeccionRequestDto dto) {
        return ResponseEntity.ok(seccionService.actualizarSeccion(id, dto));
    }

    /**
     * DELETE /api/secciones/{id} — elimina la sección y sus matrículas y evaluaciones
     * en cascada. Solo ADMIN: borrado físico completo, incluso con historial.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        seccionService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/secciones/{id}/docente — eliminación segura para el docente titular.
     * Solo el docente registrado como titular en {@code secciones.docente_id} puede invocarlo.
     * Si la sección ya tiene matrículas o evaluaciones, se rechaza con 400 para preservar
     * el histórico — en ese caso solo un ADMIN puede borrarla.
     */
    @PreAuthorize("hasRole('DOCENTE')")
    @DeleteMapping("/{id}/docente")
    public ResponseEntity<Void> eliminarComoDocente(@PathVariable Long id) {
        seccionService.eliminarComoDocente(id);
        return ResponseEntity.noContent().build();
    }
}
