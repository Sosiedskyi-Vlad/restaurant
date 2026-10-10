package com.vlad.restaurant.dto;

import jakarta.validation.constraints.NotNull;

// Тіло PATCH /menu/items/{id}/availability: { "isAvailable": false }
public record AvailabilityRequest(
        @NotNull(message = "isAvailable обов'язкове")
        Boolean isAvailable
) {}
