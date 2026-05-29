package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.aniolectivo.AnioLectivoRequestDto;
import com.atara.deb.ataraapi.model.AnioLectivo;

import java.util.List;
import java.util.Optional;

public interface AnioLectivoService {

    AnioLectivo crear(AnioLectivo anioLectivo);

    /**
     * Garantiza que el año lectivo correspondiente al año natural en curso
     * (según la fecha del sistema) exista en la base de datos.
     *
     * <p>Si el año actual aún no existe, lo crea junto con sus 3 trimestres
     * y lo marca como activo (desactivando el que estuviera activo). Si ya
     * existe, lo devuelve sin modificarlo (operación idempotente: no duplica
     * trimestres ni altera el estado de activación previo).
     *
     * @return el año lectivo del año en curso (recién creado o ya existente).
     */
    AnioLectivo asegurarAnioActual();

    AnioLectivo actualizar(Long id, AnioLectivoRequestDto dto);

    List<AnioLectivo> listarTodos();

    Optional<AnioLectivo> obtenerActivo();

    AnioLectivo buscarPorId(Long id);

    /**
     * Activa el año lectivo indicado y desactiva el que estaba activo.
     */
    AnioLectivo activar(Long id);

    /**
     * Elimina el año lectivo y todos sus datos dependientes (periodos, secciones,
     * matrículas, evaluaciones, alertas). Lanza excepción si el año está activo.
     */
    void eliminar(Long id);
}
