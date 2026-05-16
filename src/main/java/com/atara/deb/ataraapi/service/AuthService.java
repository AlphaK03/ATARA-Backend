package com.atara.deb.ataraapi.service;

import com.atara.deb.ataraapi.dto.auth.LoginRequestDto;
import com.atara.deb.ataraapi.dto.auth.LoginResponseDto;
import com.atara.deb.ataraapi.dto.auth.LogoutRequestDto;
import com.atara.deb.ataraapi.dto.auth.MeResponseDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenRequestDto;
import com.atara.deb.ataraapi.dto.auth.RefreshTokenResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;

public interface AuthService {

    LoginResponseDto login(LoginRequestDto request, HttpServletRequest httpRequest);

    RefreshTokenResponseDto refresh(RefreshTokenRequestDto request, HttpServletRequest httpRequest);

    void logout(LogoutRequestDto request);

    MeResponseDto me(Authentication authentication);
}
