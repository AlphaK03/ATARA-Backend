package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.estudiante.EstudianteRequestDto;
import com.atara.deb.ataraapi.dto.estudiante.EstudianteResponseDto;
import com.atara.deb.ataraapi.model.Estudiante;
import com.atara.deb.ataraapi.model.enums.EstadoEstudiante;
import com.atara.deb.ataraapi.service.EstudianteService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/estudiantes")
public class EstudianteController {

    private final EstudianteService estudianteService;

    public EstudianteController(EstudianteService estudianteService) {
        this.estudianteService = estudianteService;
    }

    @PostMapping
    public ResponseEntity<EstudianteResponseDto> registrar(@Valid @RequestBody EstudianteRequestDto request) {
        Estudiante estudiante = toEntity(request);
        Estudiante creado = estudianteService.registrar(estudiante);
        return ResponseEntity
                .created(URI.create("/api/estudiantes/" + creado.getId()))
                .body(toResponse(creado));
    }

    @GetMapping
    public ResponseEntity<List<EstudianteResponseDto>> listar(
            @RequestParam(required = false) EstadoEstudiante estado) {
        List<Estudiante> lista = (estado != null)
                ? estudianteService.listarPorEstado(estado)
                : estudianteService.listarTodos();
        return ResponseEntity.ok(lista.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstudianteResponseDto> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(toResponse(estudianteService.buscarPorId(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstudianteResponseDto> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody EstudianteRequestDto request) {
        Estudiante datosActualizados = toEntity(request);
        Estudiante actualizado = estudianteService.actualizar(id, datosActualizados);
        return ResponseEntity.ok(toResponse(actualizado));
    }

    /**
     * Borrado físico con cascada (alertas, evaluaciones, matrículas). Operación
     * administrativa irreversible: restringida a ADMIN (hallazgo M-08). Los DOCENTE
     * usan baja lógica (PUT estado=INACTIVO) para conservar el histórico del menor.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        estudianteService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // --- Mapeo ---

    private Estudiante toEntity(EstudianteRequestDto dto) {
        Estudiante e = new Estudiante();
        e.setIdentificacion(dto.getIdentificacion());
        e.setNombre(dto.getNombre());
        e.setApellido1(dto.getApellido1());
        e.setApellido2(dto.getApellido2());
        e.setFechaNacimiento(dto.getFechaNacimiento());
        e.setGenero(dto.getGenero());
        e.setNombreAcudiente(dto.getNombreAcudiente());
        e.setTelefonoAcudiente(dto.getTelefonoAcudiente());
        e.setCorreoAcudiente(dto.getCorreoAcudiente());
        e.setEstado(dto.getEstado()); // null → service preserva el estado actual
        return e;
    }

    private EstudianteResponseDto toResponse(Estudiante e) {
        EstudianteResponseDto dto = new EstudianteResponseDto();
        dto.setId(e.getId());
        dto.setIdentificacion(e.getIdentificacion());
        dto.setNombre(e.getNombre());
        dto.setApellido1(e.getApellido1());
        dto.setApellido2(e.getApellido2());
        dto.setFechaNacimiento(e.getFechaNacimiento());
        dto.setGenero(e.getGenero() != null ? e.getGenero().name() : null);
        dto.setNombreAcudiente(e.getNombreAcudiente());
        dto.setTelefonoAcudiente(e.getTelefonoAcudiente());
        dto.setCorreoAcudiente(e.getCorreoAcudiente());
        dto.setEstado(e.getEstado() != null ? e.getEstado().name() : null);
        dto.setCreatedAt(e.getCreatedAt());
        dto.setUpdatedAt(e.getUpdatedAt());
        return dto;
    }
}
