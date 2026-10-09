package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.dto.OrderResponse;
import com.vlad.restaurant.dto.StatusUpdateRequest;
import com.vlad.restaurant.entity.OrderStatus;
import com.vlad.restaurant.security.GuestPrincipal;
import com.vlad.restaurant.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // ---------- Гість ----------

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('GUEST')")
    public OrderResponse createOrder(
            @AuthenticationPrincipal GuestPrincipal guest,
            @Valid @RequestBody OrderCreateRequest request
    ) {
        return orderService.createOrder(guest.tableId(), request);
    }

    // Поточні (неоплачені) замовлення столу гостя
    @GetMapping("/my")
    @PreAuthorize("hasRole('GUEST')")
    public List<OrderResponse> getMyOrders(@AuthenticationPrincipal GuestPrincipal guest) {
        return orderService.getMyOrders(guest.tableId());
    }

    // ---------- Персонал ----------

    // Дошка кухні. Приклад: /api/v1/orders/active?status=NEW
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('COOK', 'WAITER', 'ADMIN')")
    public List<OrderResponse> getActiveOrders(@RequestParam(required = false) OrderStatus status) {
        return orderService.getActiveOrders(status);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('COOK', 'WAITER', 'ADMIN')")
    public OrderResponse updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody StatusUpdateRequest request,
            Authentication auth
    ) {
        return orderService.updateStatus(id, request.status(), auth);
    }

    // ---------- Спільне ----------

    // Персонал - будь-яке замовлення, гість - лише зі свого столу
    @GetMapping("/{id}")
    public OrderResponse getOrder(@PathVariable UUID id, Authentication auth) {
        return orderService.getOrder(id, auth);
    }
}
