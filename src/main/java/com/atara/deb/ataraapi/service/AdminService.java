package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.usuario.UsuarioAdminRequestDto;
import com.atara.deb.ataraapi.dto.usuario.UsuarioAdminResponseDto;

import java.util.List;

public interface AdminService {

    /** Lista todos los usuarios del sistema. Solo ADMIN. */
    List<UsuarioAdminResponseDto> listarUsuarios();

    /** Crea un nuevo usuario. El correo debe ser único. */
    UsuarioAdminResponseDto crearUsuario(UsuarioAdminRequestDto dto);

    /** Actualiza datos de un usuario existente. */
    UsuarioAdminResponseDto actualizarUsuario(Long id, UsuarioAdminRequestDto dto);

    /** Elimina un usuario por ID. */
    void eliminarUsuario(Long id);

    /** Alterna el estado del usuario entre ACTIVO e INACTIVO. */
    UsuarioAdminResponseDto toggleEstado(Long id);
}
