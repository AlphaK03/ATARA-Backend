package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.saber.EjeTemaaticoResponseDto;
import com.atara.deb.ataraapi.dto.saber.MateriaResponseDto;
import com.atara.deb.ataraapi.dto.saber.NivelDesempenoResponseDto;
import com.atara.deb.ataraapi.dto.saber.TipoSaberResponseDto;

import java.util.List;

public interface CatalogoSaberService {

    List<TipoSaberResponseDto> listarTiposSaber();

    List<MateriaResponseDto> listarMaterias();

    List<EjeTemaaticoResponseDto> listarEjesTematicos();

    List<EjeTemaaticoResponseDto> listarEjesPorTipoSaber(Integer tipoSaberId);

    List<EjeTemaaticoResponseDto> listarEjesPorMateriaYTipoSaber(Integer materiaId, Integer tipoSaberId);

    /**
     * Catálogo de ejes filtrado por nivel/grado del estudiante. Es el flujo
     * recomendado para el wizard de evaluación: garantiza que solo se muestren
     * los ejes que aplican al grado de la sección.
     *
     * <p>Si {@code materiaId}, {@code tipoSaberId} o {@code periodoNumero} son
     * {@code null}, no se aplica ese filtro. {@code nivelId} es obligatorio.
     *
     * <p>Cuando se proporciona {@code periodoNumero} (1, 2 o 3), se devuelven
     * los ejes de ese trimestre MÁS los ejes transversales
     * ({@code periodo_numero IS NULL}) que aplican a cualquier trimestre.
     */
    List<EjeTemaaticoResponseDto> listarEjesPorNivel(Long nivelId, Integer materiaId, Integer tipoSaberId, Short periodoNumero);

    List<NivelDesempenoResponseDto> listarNivelesDesempeno();
}
