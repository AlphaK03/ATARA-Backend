package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.saber.EjeTemaaticoResponseDto;
import com.atara.deb.ataraapi.dto.saber.MateriaResponseDto;
import com.atara.deb.ataraapi.dto.saber.NivelDesempenoResponseDto;
import com.atara.deb.ataraapi.dto.saber.TipoSaberResponseDto;
import com.atara.deb.ataraapi.service.CatalogoSaberService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalogos/saberes")
public class CatalogoSaberController {

    private final CatalogoSaberService catalogoSaberService;

    public CatalogoSaberController(CatalogoSaberService catalogoSaberService) {
        this.catalogoSaberService = catalogoSaberService;
    }

    @GetMapping("/tipos")
    public ResponseEntity<List<TipoSaberResponseDto>> listarTiposSaber() {
        return ResponseEntity.ok(catalogoSaberService.listarTiposSaber());
    }

    @GetMapping("/materias")
    public ResponseEntity<List<MateriaResponseDto>> listarMaterias() {
        return ResponseEntity.ok(catalogoSaberService.listarMaterias());
    }

    /**
     * Catálogo de ejes temáticos. Filtros opcionales:
     *
     * <ul>
     *   <li>{@code nivelId} — grado del estudiante; usado por el wizard de
     *       evaluación para mostrar solo los ejes evaluables en ese grado.
     *       Cuando se envía, tiene prioridad sobre los otros filtros.</li>
     *   <li>{@code materiaId} — restringe a una materia.</li>
     *   <li>{@code tipoSaberId} — restringe a Conceptual / Procedimental / Actitudinal.</li>
     *   <li>{@code periodoNumero} — restringe al trimestre 1, 2 o 3. Solo
     *       aplica cuando se pasa {@code nivelId}. Devuelve los ejes de ese
     *       trimestre más los transversales ({@code periodo_numero IS NULL}).</li>
     * </ul>
     *
     * Si no viene {@code nivelId}, el comportamiento es el legado:
     * filtrar por materia + tipo de saber (o todo si no se pasa nada).
     */
    @GetMapping("/ejes")
    public ResponseEntity<List<EjeTemaaticoResponseDto>> listarEjesTematicos(
            @RequestParam(required = false) Long    nivelId,
            @RequestParam(required = false) Integer materiaId,
            @RequestParam(required = false) Integer tipoSaberId,
            @RequestParam(required = false) Short   periodoNumero) {
        if (nivelId != null) {
            return ResponseEntity.ok(catalogoSaberService.listarEjesPorNivel(nivelId, materiaId, tipoSaberId, periodoNumero));
        }
        if (materiaId != null && tipoSaberId != null) {
            return ResponseEntity.ok(catalogoSaberService.listarEjesPorMateriaYTipoSaber(materiaId, tipoSaberId));
        }
        if (tipoSaberId != null) {
            return ResponseEntity.ok(catalogoSaberService.listarEjesPorTipoSaber(tipoSaberId));
        }
        return ResponseEntity.ok(catalogoSaberService.listarEjesTematicos());
    }

    @GetMapping("/niveles-desempeno")
    public ResponseEntity<List<NivelDesempenoResponseDto>> listarNivelesDesempeno() {
        return ResponseEntity.ok(catalogoSaberService.listarNivelesDesempeno());
    }
}
