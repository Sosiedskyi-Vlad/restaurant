package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.RestaurantInfoRequest;
import com.vlad.restaurant.dto.RestaurantInfoResponse;
import com.vlad.restaurant.service.RestaurantInfoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/restaurant-info")
@RequiredArgsConstructor
public class RestaurantInfoController {

    private final RestaurantInfoService service;

    @GetMapping
    public RestaurantInfoResponse getInfo() {
        return service.getInfo();
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public RestaurantInfoResponse updateInfo(@Valid @RequestBody RestaurantInfoRequest request) {
        return service.updateInfo(request);
    }
}
