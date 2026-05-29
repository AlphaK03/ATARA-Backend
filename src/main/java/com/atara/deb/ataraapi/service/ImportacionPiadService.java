package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.piad.ImportarPiadRequestDto;
import com.atara.deb.ataraapi.dto.piad.ImportarPiadResponseDto;

/**
 * Importación masiva de estudiantes desde una Lista PIAD ya revisada.
 * El flujo es idempotente: reutiliza estudiantes existentes, crea los nuevos y
 * los matricula en la sección solo si aún no lo están. No se detiene ni produce
 * error ante registros duplicados.
 */
public interface ImportacionPiadService {

    ImportarPiadResponseDto importar(ImportarPiadRequestDto request);
}
