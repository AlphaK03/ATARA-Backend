package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoRequestDto;
import com.atara.deb.ataraapi.dto.catalogo.CentroEducativoResponseDto;

import java.util.List;

/**
 * Gestión administrativa de los Centros Educativos.
 * Solo accesible desde el rol ADMIN.
 * Por política del proyecto NO se expone operación de borrado:
 * los centros se mantienen como histórico permanente.
 */
public interface CentroEducativoService {

    List<CentroEducativoResponseDto> listar();

    CentroEducativoResponseDto buscarPorId(Long id);

    CentroEducativoResponseDto crear(CentroEducativoRequestDto dto);

    CentroEducativoResponseDto actualizar(Long id, CentroEducativoRequestDto dto);
}
