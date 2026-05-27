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
import com.atara.deb.ataraapi.security.UsuarioPrincipal;
import com.atara.deb.ataraapi.service.AdminService;
import com.atara.deb.ataraapi.service.EmailService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class AdminServiceImpl implements AdminService {

    private static final String ROL_DOCENTE = "DOCENTE";
    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * ID del superadministrador (Carlos Rodríguez Mora, admin@atara.mep.go.cr) sembrado
     * en V2__sample_data.sql como primer registro de {@code usuarios}. Esta cuenta es
     * intocable por seguridad:
     * <ul>
     *   <li>Nadie puede eliminarla.</li>
     *   <li>Su rol y estado no pueden cambiar (ni siquiera por sí mismo).</li>
     *   <li>Solo el propio superadmin puede actualizar sus datos no críticos
     *       (nombre, apellidos, correo, password).</li>
     * </ul>
     * Si en el futuro se necesita un mecanismo más flexible se debería añadir
     * una columna {@code es_superadmin} en {@code usuarios}.
     */
    private static final long SUPERADMIN_ID = 1L;

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final MateriaRepository materiaRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AdminServiceImpl(UsuarioRepository usuarioRepository,
                            RolRepository rolRepository,
                            MateriaRepository materiaRepository,
                            PasswordEncoder passwordEncoder,
                            EmailService emailService) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.materiaRepository = materiaRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
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
        Rol rol = rolRepository.findByNombre(dto.getRol())
                .orElseThrow(() -> new IllegalArgumentException("Rol no válido: " + dto.getRol()));

        String tempPassword = generarPasswordTemporal();

        Usuario u = Usuario.builder()
                .nombre(dto.getNombre())
                .apellidos(dto.getApellidos())
                .correo(dto.getCorreo())
                .password(passwordEncoder.encode(tempPassword))
                .rol(rol)
                .estado(EstadoUsuario.ACTIVO)
                .debeCambiarPassword(true)
                .materiasAsignadas(new ArrayList<>())
                .seccionesAsignadas(new ArrayList<>())
                .build();

        if (ROL_DOCENTE.equalsIgnoreCase(rol.getNombre())) {
            List<Materia> materias = resolverMaterias(dto.getMateriaIds());
            u.getMateriasAsignadas().addAll(materias);
        }

        UsuarioAdminResponseDto result = toDto(usuarioRepository.save(u));

        emailService.enviarBienvenida(dto.getCorreo(), dto.getNombre(), tempPassword);

        return result;
    }

    private String generarPasswordTemporal() {
        StringBuilder sb = new StringBuilder("Atara");
        for (int i = 0; i < 6; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return sb.toString();
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

        Long callerId = obtenerIdUsuarioActual();
        boolean editandoseASiMismo = Objects.equals(callerId, id);
        boolean esSuperadmin       = id == SUPERADMIN_ID;

        // Solo el superadmin puede tocar su propio registro. Cualquier otro admin
        // recibe 400 si intenta editar al superadmin.
        if (esSuperadmin && !editandoseASiMismo) {
            throw new IllegalArgumentException(
                    "El administrador principal no puede ser modificado por otros usuarios.");
        }

        if (!u.getCorreo().equalsIgnoreCase(dto.getCorreo())
                && usuarioRepository.existsByCorreo(dto.getCorreo())) {
            throw new IllegalArgumentException("Ya existe un usuario con el correo: " + dto.getCorreo());
        }
        Rol rol = rolRepository.findByNombre(dto.getRol())
                .orElseThrow(() -> new IllegalArgumentException("Rol no válido: " + dto.getRol()));

        // Reglas de blindaje sobre rol y estado:
        //   - Nadie puede cambiar su propio rol o estado (anti lock-out).
        //   - El superadmin nunca cambia de rol ni estado, ni siquiera por sí mismo.
        boolean rolCambia    = !Objects.equals(u.getRol().getNombre(), rol.getNombre());
        boolean estadoCambia = dto.getEstado() != null
                && !dto.getEstado().isBlank()
                && !dto.getEstado().equalsIgnoreCase(u.getEstado().name());

        if (esSuperadmin && (rolCambia || estadoCambia)) {
            throw new IllegalArgumentException(
                    "El rol y estado del administrador principal no pueden modificarse.");
        }
        if (editandoseASiMismo && rolCambia) {
            throw new IllegalArgumentException("No puede cambiar su propio rol.");
        }
        if (editandoseASiMismo && estadoCambia) {
            throw new IllegalArgumentException("No puede cambiar su propio estado.");
        }

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
        if (id == SUPERADMIN_ID) {
            throw new IllegalArgumentException(
                    "El administrador principal no puede ser eliminado.");
        }
        Long callerId = obtenerIdUsuarioActual();
        if (Objects.equals(callerId, id)) {
            throw new IllegalArgumentException(
                    "No puede eliminar su propia cuenta.");
        }
        usuarioRepository.deleteById(id);
    }

    @Override
    @Transactional
    public UsuarioAdminResponseDto toggleEstado(Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado: " + id));

        if (id == SUPERADMIN_ID) {
            throw new IllegalArgumentException(
                    "El estado del administrador principal no puede modificarse.");
        }
        Long callerId = obtenerIdUsuarioActual();
        if (Objects.equals(callerId, id)) {
            throw new IllegalArgumentException("No puede cambiar su propio estado.");
        }

        u.setEstado(u.getEstado() == EstadoUsuario.ACTIVO
                ? EstadoUsuario.INACTIVO
                : EstadoUsuario.ACTIVO);

        return toDto(usuarioRepository.save(u));
    }

    private Long obtenerIdUsuarioActual() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UsuarioPrincipal up)) {
            return null;
        }
        return up.getUsuario().getId();
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
