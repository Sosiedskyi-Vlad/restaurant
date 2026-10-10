package com.vlad.restaurant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "Назва категорії обов'язкова")
        @Size(max = 100, message = "Назва не довша за 100 символів")
        String name
) {}
