package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.OrderStatus;
import jakarta.validation.constraints.NotNull;

// Тіло PATCH /orders/{id}/status: { "status": "PREPARING" }
public record StatusUpdateRequest(
        @NotNull(message = "status обов'язковий")
        OrderStatus status
) {}
