package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.auth.LoginRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginResponseDto;
import com.atara.deb.ataraapi.dto.auth.LogoutRequestDto;
import com.atara.deb.ataraapi.dto.auth.MeResponseDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenRequestDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenResponseDto;
import com.atara.deb.ataraapi.dto.auth.RegistroRequestDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface AuthService {

    LoginResponseDto login(LoginRequestDto request, HttpServletRequest httpRequest);

    RefreshTokenResponseDto refresh(RefreshTokenRequestDto request, HttpServletRequest httpRequest);

    void logout(LogoutRequestDto request);

    MeResponseDto me(Authentication authentication);

    void cambiarPassword(Authentication authentication, String passwordActual, String nuevaPassword);

    void registro(RegistroRequestDto request);

    void actualizarMisMaterias(Authentication authentication, List<Integer> materiasIds);
}
