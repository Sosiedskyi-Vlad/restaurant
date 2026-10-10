package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.AuthResponse;
import com.vlad.restaurant.dto.StaffLoginRequest;
import com.vlad.restaurant.dto.TableLoginRequest;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.entity.User;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import com.vlad.restaurant.repository.UserRepository;
import com.vlad.restaurant.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RestaurantTableRepository tableRepository;
    private final JwtService jwtService;

    // Вхід персоналу за логіном і паролем
    public AuthResponse staffLogin(StaffLoginRequest request) {
        // Кидає BadCredentialsException, якщо email/пароль невірні
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Невірний email або пароль"));

        String token = jwtService.generateToken(Map.of(JwtService.CLAIM_ROLE, user.getRole().name()), user);
        return new AuthResponse(token, user.getRole().name(), null);
    }

    // Вхід гостя за хешем із QR-коду
    public AuthResponse tableLogin(TableLoginRequest request) {
        RestaurantTable table = tableRepository.findByQrCodeHash(request.qrHash())
                .orElseThrow(() -> new BadCredentialsException("Недійсний QR-код"));

        String token = jwtService.generateGuestToken(table.getId());
        return new AuthResponse(token, JwtService.ROLE_GUEST, table.getNumber());
    }
}
