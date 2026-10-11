package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.OrderItemStatus;
import jakarta.validation.constraints.NotNull;

public record ItemStatusUpdateRequest(
        @NotNull(message = "Статус обов'язковий")
        OrderItemStatus status
) {}
