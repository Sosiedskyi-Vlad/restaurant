package com.vlad.restaurant.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

// Використовується і для створення (POST), і для повного оновлення (PUT)
public record MenuItemRequest(
        @NotBlank(message = "Назва страви обов'язкова")
        @Size(max = 150, message = "Назва не довша за 150 символів")
        String name,

        @NotNull(message = "Ціна обов'язкова")
        @DecimalMin(value = "0.01", message = "Ціна має бути більшою за 0")
        @DecimalMax(value = "99999999.99", message = "Ціна завелика")
        BigDecimal price,

        @Size(max = 500, message = "URL не довший за 500 символів")
        String imageUrl,

        String ingredients,

        String allergens,

        @NotNull(message = "categoryId обов'язковий")
        Integer categoryId
) {}
