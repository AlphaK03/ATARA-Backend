package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoResponseDto;
import com.atara.deb.ataraapi.dto.catalogo.EstudianteCatalogoDto;
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

    /**
     * Catálogo de estudiantes candidatos para matricular en el wizard de sección.
     * Ambos roles ADMIN y DOCENTE necesitan ver el catálogo completo (no filtrado
     * por sus secciones), porque al crear una sección nueva nadie está aún
     * matriculado con el docente y con el filtro habitual la lista llegaba vacía.
     *
     * @param anioLectivoId si se indica, excluye los estudiantes que ya tengan
     *                      matrícula registrada en ese año (regla de negocio:
     *                      una matrícula por estudiante por año).
     * @param seccionId     opcional. En el wizard de edición re-incluye los
     *                      estudiantes ya matriculados en esta sección, para que
     *                      sigan apareciendo seleccionados.
     */
    List<EstudianteCatalogoDto> listarEstudiantesDisponibles(Long anioLectivoId, Long seccionId);

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
