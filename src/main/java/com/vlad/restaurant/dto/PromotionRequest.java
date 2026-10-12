package com.vlad.restaurant.dto;

import jakarta.validation.constraints.NotBlank;

public record PromotionRequest(
        @NotBlank(message = "Заголовок акції є обов'язковим")
        String title,
        String badgeText,
        String shortDescription,
        String fullContent,
        String imageUrl,
        String actionType,
        Long targetMenuItemId,
        Boolean active,
        Integer displayOrder
) {
}
