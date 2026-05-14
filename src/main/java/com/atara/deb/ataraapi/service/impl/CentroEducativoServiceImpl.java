package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoRequestDto;
import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoResponseDto;
import com.atara.deb.ataraapi.model.CentroEducativo;
import com.atara.deb.ataraapi.repository.CentroEducativoRepository;
import com.atara.deb.ataraapi.service.CentroEducativoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@Transactional(readOnly = true)
public class CentroEducativoServiceImpl implements CentroEducativoService {

    private final CentroEducativoRepository centroRepository;

    public CentroEducativoServiceImpl(CentroEducativoRepository centroRepository) {
        this.centroRepository = centroRepository;
    }

    @Override
    public List<CentroEducativoResponseDto> listar() {
        return centroRepository.findAll()
                .stream()
                .sorted((a, b) -> a.getNombre().compareToIgnoreCase(b.getNombre()))
                .map(this::toDto)
                .toList();
    }

    @Override
    public CentroEducativoResponseDto buscarPorId(Long id) {
        CentroEducativo centro = centroRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Centro educativo no encontrado con id: " + id));
        return toDto(centro);
    }

    @Override
    @Transactional
    public CentroEducativoResponseDto crear(CentroEducativoRequestDto dto) {
        if (centroRepository.existsByNombreIgnoreCase(dto.getNombre())) {
            throw new IllegalArgumentException(
                    "Ya existe un centro educativo con el nombre: " + dto.getNombre());
        }

        CentroEducativo centro = CentroEducativo.builder()
                .nombre(dto.getNombre())
                .circuito(dto.getCircuito())
                .direccionRegional(dto.getDireccionRegional())
                .telefono(dto.getTelefono())
                .correo(dto.getCorreo())
                .build();

        return toDto(centroRepository.save(centro));
    }

    @Override
    @Transactional
    public CentroEducativoResponseDto actualizar(Long id, CentroEducativoRequestDto dto) {
        CentroEducativo centro = centroRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Centro educativo no encontrado con id: " + id));

        // Si cambia el nombre, verificar que no choque con otro existente.
        if (!centro.getNombre().equalsIgnoreCase(dto.getNombre())
                && centroRepository.existsByNombreIgnoreCase(dto.getNombre())) {
            throw new IllegalArgumentException(
                    "Ya existe un centro educativo con el nombre: " + dto.getNombre());
        }

        centro.setNombre(dto.getNombre());
        centro.setCircuito(dto.getCircuito());
        centro.setDireccionRegional(dto.getDireccionRegional());
        centro.setTelefono(dto.getTelefono());
        centro.setCorreo(dto.getCorreo());

        return toDto(centroRepository.save(centro));
    }

    private CentroEducativoResponseDto toDto(CentroEducativo c) {
        return CentroEducativoResponseDto.builder()
                .id(c.getId())
                .nombre(c.getNombre())
                .circuito(c.getCircuito())
                .direccionRegional(c.getDireccionRegional())
                .telefono(c.getTelefono())
                .correo(c.getCorreo())
                .build();
    }
}
