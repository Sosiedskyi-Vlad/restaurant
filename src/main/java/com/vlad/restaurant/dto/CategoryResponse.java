package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.Category;

public record CategoryResponse(Integer id, String name) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName());
    }
}
