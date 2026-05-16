package com.atara.deb.ataraapi.service.impl;

import com.atara.deb.ataraapi.dto.usuario.UsuarioAdminRequestDto;
import com.atara.deb.ataraapi.dto.usuario.UsuarioAdminResponseDto;
import com.atara.deb.ataraapi.model.Materia;
import com.atara.deb.ataraapi.model.Rol;
import com.atara.deb.ataraapi.model.Usuario;
import com.atara.deb.ataraapi.model.enums.EstadoUsuario;
import com.atara.deb.ataraapi.repository.MateriaRepository;
import com.atara.deb.ataraapi.repository.RolRepository;
import com.atara.deb.ataraapi.repository.UsuarioRepository;
import com.atara.deb.ataraapi.service.AdminService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@Transactional(readOnly = true)
public class AdminServiceImpl implements AdminService {

    private static final String ROL_DOCENTE = "DOCENTE";

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final MateriaRepository materiaRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminServiceImpl(UsuarioRepository usuarioRepository,
                            RolRepository rolRepository,
                            MateriaRepository materiaRepository,
                            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.materiaRepository = materiaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public List<UsuarioAdminResponseDto> listarUsuarios() {
        return usuarioRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public UsuarioAdminResponseDto crearUsuario(UsuarioAdminRequestDto dto) {
        if (usuarioRepository.existsByCorreo(dto.getCorreo())) {
            throw new IllegalArgumentException("Ya existe un usuario con el correo: " + dto.getCorreo());
        }
        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            throw new IllegalArgumentException("La contraseña es requerida al crear un usuario.");
        }
        Rol rol = rolRepository.findByNombre(dto.getRol())
                .orElseThrow(() -> new IllegalArgumentException("Rol no válido: " + dto.getRol()));

        Usuario u = Usuario.builder()
                .nombre(dto.getNombre())
                .apellidos(dto.getApellidos())
                .correo(dto.getCorreo())
                .password(passwordEncoder.encode(dto.getPassword()))
                .rol(rol)
                .estado(EstadoUsuario.ACTIVO)
                .materiasAsignadas(new ArrayList<>())
                .seccionesAsignadas(new ArrayList<>())
                .build();

        // Para DOCENTE asignamos materias automáticamente, replicando lo que hizo el
        // seed V8__usuario_materias.sql con los docentes ya existentes. Sin esto los
        // usuarios nuevos quedan sin materias y el wizard de evaluación no carga
        // las preguntas (verificarMateria del ContextoUsuario lanza AccesoDenegado).
        if (ROL_DOCENTE.equalsIgnoreCase(rol.getNombre())) {
            List<Materia> materias = resolverMaterias(dto.getMateriaIds());
            u.getMateriasAsignadas().addAll(materias);
        }

        return toDto(usuarioRepository.save(u));
    }

    /**
     * - Lista nula o vacía → todas las materias (comportamiento por defecto, evita
     *   el bug de docentes sin materias).
     * - Lista con IDs → solo esas materias; valida que cada ID exista.
     */
    private List<Materia> resolverMaterias(List<Integer> materiaIds) {
        if (materiaIds == null || materiaIds.isEmpty()) {
            return new ArrayList<>(materiaRepository.findAll());
        }
        List<Materia> resultado = new ArrayList<>(materiaIds.size());
        for (Integer id : materiaIds) {
            Materia m = materiaRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Materia no encontrada: " + id));
            resultado.add(m);
        }
        return resultado;
    }

    @Override
    @Transactional
    public UsuarioAdminResponseDto actualizarUsuario(Long id, UsuarioAdminRequestDto dto) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado: " + id));

        if (!u.getCorreo().equalsIgnoreCase(dto.getCorreo())
                && usuarioRepository.existsByCorreo(dto.getCorreo())) {
            throw new IllegalArgumentException("Ya existe un usuario con el correo: " + dto.getCorreo());
        }
        Rol rol = rolRepository.findByNombre(dto.getRol())
                .orElseThrow(() -> new IllegalArgumentException("Rol no válido: " + dto.getRol()));

        u.setNombre(dto.getNombre());
        u.setApellidos(dto.getApellidos());
        u.setCorreo(dto.getCorreo());
        u.setRol(rol);

        if (dto.getEstado() != null && !dto.getEstado().isBlank()) {
            try {
                u.setEstado(EstadoUsuario.valueOf(dto.getEstado()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Estado no válido: " + dto.getEstado());
            }
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            u.setPassword(passwordEncoder.encode(dto.getPassword()));
        }

        // Reasignación de materias solo si el cliente envía la lista en el PUT.
        // null → no toca nada; lista (incluso vacía) → reemplaza el conjunto.
        if (dto.getMateriaIds() != null && ROL_DOCENTE.equalsIgnoreCase(rol.getNombre())) {
            List<Materia> nuevas = resolverMaterias(dto.getMateriaIds());
            u.getMateriasAsignadas().clear();
            u.getMateriasAsignadas().addAll(nuevas);
        }

        return toDto(usuarioRepository.save(u));
    }

    @Override
    @Transactional
    public void eliminarUsuario(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new NoSuchElementException("Usuario no encontrado: " + id);
        }
        usuarioRepository.deleteById(id);
    }

    private UsuarioAdminResponseDto toDto(Usuario u) {
        List<Integer> materiaIds = (u.getMateriasAsignadas() != null)
                ? u.getMateriasAsignadas().stream().map(Materia::getId).toList()
                : List.of();
        return UsuarioAdminResponseDto.builder()
                .id(u.getId())
                .nombre(u.getNombre())
                .apellidos(u.getApellidos())
                .correo(u.getCorreo())
                .rol(u.getRol().getNombre())
                .estado(u.getEstado().name())
                .materiaIds(materiaIds)
                .build();
    }
}
