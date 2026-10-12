package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.OrderStatus;

// Повідомлення, яке отримують WebSocket-клієнти
public record OrderEventMessage(
        Type type,
        OrderStatus previousStatus, // null для ORDER_CREATED
        OrderResponse order
) {
    public enum Type {
        ORDER_CREATED,
        ORDER_STATUS_CHANGED,
        ORDER_PAID,
        ORDER_PROMOTION_UPDATED
    }
}
