package com.vlad.restaurant.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

// tableId тут немає навмисно: бекенд бере його з JWT-токена гостя (захист від підміни столу)
public record OrderCreateRequest(
        @NotEmpty(message = "Замовлення не може бути порожнім")
        List<@Valid OrderItemRequest> items
) {
    public record OrderItemRequest(
            @NotNull(message = "menuItemId обов'язковий")
            Long menuItemId,

            @NotNull(message = "quantity обов'язкове")
            @Min(value = 1, message = "Кількість має бути не менше 1")
            Integer quantity,
            Map<String, List<String>> options
    ) {}
}
