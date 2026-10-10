package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.entity.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        Integer tableNumber,
        OrderStatus status,
        LocalDateTime createdAt,
        List<Item> items,
        BigDecimal total,
        boolean paid
) {
    public record Item(Long menuItemId, String name, Integer quantity, BigDecimal priceAtTime) {}

    public static OrderResponse from(Order order) {
        List<Item> items = order.getItems().stream()
                .map(i -> new Item(
                        i.getMenuItem().getId(),
                        i.getMenuItem().getName(),
                        i.getQuantity(),
                        i.getPriceAtTime()))
                .toList();
        BigDecimal total = items.stream()
                .map(i -> i.priceAtTime().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new OrderResponse(
                order.getId(),
                order.getTable() != null ? order.getTable().getNumber() : null,
                order.getStatus(),
                order.getCreatedAt(),
                items,
                total,
                order.isPaid());
    }
}
