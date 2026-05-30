package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.alertatematica.AlertaTematicaResponseDto;
import com.atara.deb.ataraapi.service.AlertaTematicaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alertas-tematicas")
public class AlertaTematicaController {

    private final AlertaTematicaService alertaTematicaService;

    public AlertaTematicaController(AlertaTematicaService alertaTematicaService) {
        this.alertaTematicaService = alertaTematicaService;
    }

    @PostMapping("/generar/estudiante/{estudianteId}/periodo/{periodoId}")
    public ResponseEntity<List<AlertaTematicaResponseDto>> generarPorEstudiante(
            @PathVariable Long estudianteId,
            @PathVariable Long periodoId,
            @RequestParam Long seccionId) {
        return ResponseEntity.ok(
            alertaTematicaService.generarAlertasPorEstudiante(estudianteId, periodoId, seccionId));
    }

    @PostMapping("/generar/seccion/{seccionId}/periodo/{periodoId}")
    public ResponseEntity<List<AlertaTematicaResponseDto>> generarPorSeccion(
            @PathVariable Long seccionId, @PathVariable Long periodoId) {
        return ResponseEntity.ok(alertaTematicaService.generarAlertasPorSeccion(seccionId, periodoId));
    }

    @GetMapping("/estudiante/{estudianteId}/periodo/{periodoId}")
    public ResponseEntity<List<AlertaTematicaResponseDto>> obtenerPorEstudiante(
            @PathVariable Long estudianteId, @PathVariable Long periodoId) {
        return ResponseEntity.ok(alertaTematicaService.obtenerAlertasPorEstudiante(estudianteId, periodoId));
    }

    @GetMapping("/seccion/{seccionId}/periodo/{periodoId}")
    public ResponseEntity<List<AlertaTematicaResponseDto>> obtenerPorSeccion(
            @PathVariable Long seccionId, @PathVariable Long periodoId) {
        return ResponseEntity.ok(alertaTematicaService.obtenerAlertasPorSeccion(seccionId, periodoId));
    }
}
