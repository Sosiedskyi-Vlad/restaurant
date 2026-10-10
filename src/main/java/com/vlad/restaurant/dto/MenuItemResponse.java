package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.MenuItem;

import java.math.BigDecimal;

public record MenuItemResponse(
        Long id,
        String name,
        BigDecimal price,
        String imageUrl,
        String ingredients,
        String allergens,
        Integer favoritesCount,
        boolean isAvailable,
        Integer categoryId,
        String categoryName
) {
    public static MenuItemResponse from(MenuItem m) {
        return new MenuItemResponse(
                m.getId(),
                m.getName(),
                m.getPrice(),
                m.getImageUrl(),
                m.getIngredients(),
                m.getAllergens(),
                m.getFavoritesCount(),
                m.isAvailable(),
                m.getCategory() != null ? m.getCategory().getId() : null,
                m.getCategory() != null ? m.getCategory().getName() : null);
    }
}
