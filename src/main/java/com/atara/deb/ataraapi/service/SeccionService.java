package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoResponseDto;
import com.atara.deb.ataraapi.dto.catalogo.NivelResponseDto;
import com.atara.deb.ataraapi.dto.seccion.SeccionRequestDto;
import com.atara.deb.ataraapi.dto.seccion.SeccionResponseDto;
import com.atara.deb.ataraapi.dto.usuario.UsuarioDocenteResponseDto;

import java.util.List;

public interface SeccionService {
    List<SeccionResponseDto> listarPorAnioLectivo(Long anioLectivoId);
    List<SeccionResponseDto> listarPorDocente(Long docenteId);
    SeccionResponseDto buscarPorId(Long id);
    SeccionResponseDto crearSeccion(SeccionRequestDto dto);

    SeccionResponseDto actualizarSeccion(Long id, SeccionRequestDto dto);

    List<NivelResponseDto> listarNiveles();
    List<CentroEducativoResponseDto> listarCentros();
    List<UsuarioDocenteResponseDto> listarDocentes();

    void eliminar(Long id);

    /**
     * Eliminación de una sección por parte del usuario DOCENTE autenticado.
     * Reglas:
     *   - Solo el docente titular (secciones.docente_id = id del usuario) puede borrar.
     *   - La sección NO debe tener matrículas, evaluaciones ni evaluaciones por saber.
     *   - Si tiene cualquiera de esas dependencias se lanza IllegalArgumentException
     *     (mapeada a 400/409 — preserva los datos históricos).
     */
    void eliminarComoDocente(Long id);
}
