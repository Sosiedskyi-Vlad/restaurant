package com.vlad.restaurant.dto;

import java.util.List;
import java.util.UUID;

// Record автоматично генерує конструктори та геттери. Це сучасний стандарт Java.
public record OrderCreateRequest(
        Integer tableNumber, // Номер стола, з якого роблять замовлення
        List<OrderItemRequest> items // Список страв
) {
    // Вкладений record для конкретної позиції (яка страва і скільки штук)
    public record OrderItemRequest(
            Long menuItemId,
            Integer quantity
    ) {}
}