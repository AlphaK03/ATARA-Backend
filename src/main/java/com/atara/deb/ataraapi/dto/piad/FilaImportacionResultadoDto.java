package com.atara.deb.ataraapi.dto.piad;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resultado de procesar una fila de la importación, para que la UI pueda
 * mostrar qué pasó con cada estudiante.
 *
 * <p>{@code estado} es uno de:
 * <ul>
 *   <li>{@code CREADO_Y_MATRICULADO} — estudiante nuevo, creado y matriculado.</li>
 *   <li>{@code REUTILIZADO_Y_MATRICULADO} — ya existía; se matriculó en la sección.</li>
 *   <li>{@code YA_MATRICULADO} — ya pertenecía a la sección; se omitió.</li>
 *   <li>{@code ERROR} — fallo inesperado en esa fila (resto no se detiene).</li>
 * </ul>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilaImportacionResultadoDto {
    private String identificacion;
    private String nombreCompleto;
    private String estado;
    private String mensaje;
}
