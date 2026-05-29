package com.atara.deb.ataraapi.controller;

import com.atara.deb.ataraapi.dto.piad.EstudiantePIADDto;
import com.atara.deb.ataraapi.dto.piad.ImportarPiadRequestDto;
import com.atara.deb.ataraapi.dto.piad.ImportarPiadResponseDto;
import com.atara.deb.ataraapi.service.ImportacionPiadService;
import com.atara.deb.ataraapi.service.PiadService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/piad")
public class PiadController {

    private final PiadService piadService;
    private final ImportacionPiadService importacionPiadService;

    public PiadController(PiadService piadService,
                          ImportacionPiadService importacionPiadService) {
        this.piadService = piadService;
        this.importacionPiadService = importacionPiadService;
    }

    /**
     * Recibe un PDF de Lista PIAD y devuelve los estudiantes extraídos por OCR.
     * La persistencia en base de datos no está implementada aún.
     */
    @PostMapping(value = "/extraer", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<EstudiantePIADDto>> extraer(
            @RequestParam("archivo") MultipartFile archivo) throws Exception {

        if (archivo.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String contentType = archivo.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            return ResponseEntity.badRequest().build();
        }

        List<EstudiantePIADDto> estudiantes = piadService.extraerEstudiantes(archivo);
        return ResponseEntity.ok(estudiantes);
    }

    /**
     * Importa masivamente los estudiantes ya revisados de una Lista PIAD y los
     * matricula en la sección destino. El flujo es idempotente: reutiliza
     * estudiantes existentes, crea los nuevos y matricula solo a quienes aún no
     * pertenecen a la sección. No falla ni se detiene por registros duplicados.
     */
    @PostMapping("/importar")
    public ResponseEntity<ImportarPiadResponseDto> importar(
            @Valid @RequestBody ImportarPiadRequestDto request) {
        return ResponseEntity.ok(importacionPiadService.importar(request));
    }
}
