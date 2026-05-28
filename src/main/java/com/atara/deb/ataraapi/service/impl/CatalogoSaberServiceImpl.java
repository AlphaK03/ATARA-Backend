package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.saber.EjeTemaaticoResponseDto;
import com.atara.deb.ataraapi.dto.saber.MateriaResponseDto;
import com.atara.deb.ataraapi.dto.saber.NivelDesempenoResponseDto;
import com.atara.deb.ataraapi.dto.saber.TipoSaberResponseDto;
import com.atara.deb.ataraapi.model.EjeTematico;
import com.atara.deb.ataraapi.repository.EjeTemaaticoRepository;
import com.atara.deb.ataraapi.repository.MateriaRepository;
import com.atara.deb.ataraapi.repository.NivelDesempenoRepository;
import com.atara.deb.ataraapi.repository.TipoSaberRepository;
import com.atara.deb.ataraapi.service.CatalogoSaberService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CatalogoSaberServiceImpl implements CatalogoSaberService {

    private final TipoSaberRepository tipoSaberRepository;
    private final EjeTemaaticoRepository ejeTemaaticoRepository;
    private final NivelDesempenoRepository nivelDesempenoRepository;
    private final MateriaRepository materiaRepository;

    public CatalogoSaberServiceImpl(TipoSaberRepository tipoSaberRepository,
                                     EjeTemaaticoRepository ejeTemaaticoRepository,
                                     NivelDesempenoRepository nivelDesempenoRepository,
                                     MateriaRepository materiaRepository) {
        this.tipoSaberRepository = tipoSaberRepository;
        this.ejeTemaaticoRepository = ejeTemaaticoRepository;
        this.nivelDesempenoRepository = nivelDesempenoRepository;
        this.materiaRepository = materiaRepository;
    }

    @Override
    public List<TipoSaberResponseDto> listarTiposSaber() {
        return tipoSaberRepository.findAll().stream()
            .map(ts -> TipoSaberResponseDto.builder()
                .id(ts.getId())
                .clave(ts.getClave())
                .nombre(ts.getNombre())
                .descripcion(ts.getDescripcion())
                .build())
            .toList();
    }

    @Override
    public List<MateriaResponseDto> listarMaterias() {
        return materiaRepository.findAll().stream()
            .map(m -> MateriaResponseDto.builder()
                .id(m.getId())
                .clave(m.getClave())
                .nombre(m.getNombre())
                .build())
            .toList();
    }

    @Override
    public List<EjeTemaaticoResponseDto> listarEjesTematicos() {
        return ejeTemaaticoRepository.findAllByOrderByTipoSaberIdAscOrdenAsc().stream()
            .map(this::toEjeDto)
            .toList();
    }

    @Override
    public List<EjeTemaaticoResponseDto> listarEjesPorTipoSaber(Integer tipoSaberId) {
        return ejeTemaaticoRepository.findByTipoSaberIdOrderByOrden(tipoSaberId).stream()
            .map(this::toEjeDto)
            .toList();
    }

    @Override
    public List<EjeTemaaticoResponseDto> listarEjesPorMateriaYTipoSaber(Integer materiaId, Integer tipoSaberId) {
        return ejeTemaaticoRepository.findByMateriaIdAndTipoSaberIdOrderByOrden(materiaId, tipoSaberId).stream()
            .map(this::toEjeDto)
            .toList();
    }

    @Override
    public List<EjeTemaaticoResponseDto> listarEjesPorNivel(Long nivelId, Integer materiaId, Integer tipoSaberId, Short periodoNumero) {
        if (nivelId == null) {
            throw new IllegalArgumentException("nivelId es requerido para filtrar ejes por grado.");
        }
        if (periodoNumero != null && (periodoNumero < 1 || periodoNumero > 3)) {
            throw new IllegalArgumentException("periodoNumero debe estar entre 1 y 3 si se proporciona.");
        }
        return ejeTemaaticoRepository
            .findByNivelOptMateriaOptTipoSaber(nivelId, materiaId, tipoSaberId, periodoNumero)
            .stream()
            .map(this::toEjeDto)
            .toList();
    }

    @Override
    public List<NivelDesempenoResponseDto> listarNivelesDesempeno() {
        return nivelDesempenoRepository.findAllByOrderByValorNumericoAsc().stream()
            .map(nd -> NivelDesempenoResponseDto.builder()
                .id(nd.getId())
                .valorNumerico(nd.getValorNumerico())
                .nombre(nd.getNombre())
                .etiqueta(nd.getEtiqueta())
                .descripcion(nd.getDescripcion())
                .build())
            .toList();
    }

    private EjeTemaaticoResponseDto toEjeDto(EjeTematico ej) {
        return EjeTemaaticoResponseDto.builder()
            .id(ej.getId())
            .clave(ej.getClave())
            .nombre(ej.getNombre())
            .descripcion(ej.getDescripcion())
            .orden(ej.getOrden())
            .tipoSaberId(ej.getTipoSaber().getId())
            .tipoSaberNombre(ej.getTipoSaber().getNombre())
            .materiaId(ej.getMateria().getId())
            .materiaNombre(ej.getMateria().getNombre())
            .periodoNumero(ej.getPeriodoNumero())
            .build();
    }
}
