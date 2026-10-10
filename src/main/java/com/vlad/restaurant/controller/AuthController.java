package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.AuthResponse;
import com.vlad.restaurant.dto.StaffLoginRequest;
import com.vlad.restaurant.dto.TableLoginRequest;
import com.vlad.restaurant.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/staff-login")
    public AuthResponse staffLogin(@Valid @RequestBody StaffLoginRequest request) {
        return authService.staffLogin(request);
    }

    @PostMapping("/table-login")
    public AuthResponse tableLogin(@Valid @RequestBody TableLoginRequest request) {
        return authService.tableLogin(request);
    }
}
