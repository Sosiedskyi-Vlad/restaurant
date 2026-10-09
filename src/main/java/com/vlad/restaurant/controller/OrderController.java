package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.dto.OrderResponse;
import com.vlad.restaurant.security.GuestPrincipal;
import com.vlad.restaurant.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // TODO (крок 4): GET /my, GET /active, GET /{id}, PATCH /{id}/status
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('GUEST')")
    public OrderResponse createOrder(
            @AuthenticationPrincipal GuestPrincipal guest,
            @Valid @RequestBody OrderCreateRequest request
    ) {
        return orderService.createOrder(guest.tableId(), request);
    }
}
