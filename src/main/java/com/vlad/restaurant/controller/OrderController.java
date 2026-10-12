package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.dto.OrderResponse;
import com.vlad.restaurant.dto.StatusUpdateRequest;
import com.vlad.restaurant.dto.ItemStatusUpdateRequest;
import com.vlad.restaurant.dto.KdsMetricsResponse;
import com.vlad.restaurant.entity.OrderStatus;
import com.vlad.restaurant.security.GuestPrincipal;
import com.vlad.restaurant.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
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

    // Історія всіх замовлень з пагінацією та гнучкими фільтрами
    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('COOK', 'WAITER', 'ADMIN')")
    public Page<OrderResponse> getOrderHistory(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) Integer tableNumber,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        LocalDateTime fromDt = parseDateTime(from);
        LocalDateTime toDt = parseDateTime(to);
        return orderService.getOrderHistory(status, tableNumber, fromDt, toDt, search, pageable);
    }

    private LocalDateTime parseDateTime(String text) {
        if (text == null || text.isBlank()) return null;
        try {
            if (text.endsWith("Z") || text.contains("+")) {
                return OffsetDateTime.parse(text).toLocalDateTime();
            }
            if (text.length() == 10) {
                return LocalDate.parse(text).atStartOfDay();
            }
            return LocalDateTime.parse(text);
        } catch (Exception e) {
            return null;
        }
    }

    // Останні 10 закритих замовлень для швидкого recall на KDS
    @GetMapping("/recent-closed")
    @PreAuthorize("hasAnyRole('COOK', 'WAITER', 'ADMIN')")
    public List<OrderResponse> getRecentlyClosedOrders() {
        return orderService.getRecentlyClosedOrders();
    }

    // Повернення випадково закритого замовлення назад у роботу
    @PostMapping("/{id}/recall")
    @PreAuthorize("hasAnyRole('COOK', 'WAITER', 'ADMIN')")
    public OrderResponse recallOrder(@PathVariable UUID id, Authentication auth) {
        return orderService.recallOrder(id, auth);
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

    @PatchMapping("/{orderId}/items/{itemId}/status")
    @PreAuthorize("hasAnyRole('COOK', 'WAITER', 'ADMIN')")
    public OrderResponse updateItemStatus(
            @PathVariable UUID orderId,
            @PathVariable UUID itemId,
            @Valid @RequestBody ItemStatusUpdateRequest request,
            Authentication auth
    ) {
        return orderService.updateItemStatus(orderId, itemId, request.status(), auth);
    }

    @GetMapping("/kds-metrics")
    @PreAuthorize("hasAnyRole('COOK', 'WAITER', 'ADMIN')")
    public KdsMetricsResponse getKdsMetrics() {
        return orderService.getKdsMetrics();
    }

    // ---------- Спільне ----------

    // Персонал - будь-яке замовлення, гість - лише зі свого столу
    @GetMapping("/{id}")
    public OrderResponse getOrder(@PathVariable UUID id, Authentication auth) {
        return orderService.getOrder(id, auth);
    }
}
