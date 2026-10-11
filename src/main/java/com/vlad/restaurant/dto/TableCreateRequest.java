package com.vlad.restaurant.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record TableCreateRequest(
        @NotNull @Min(1) Integer number,
        String zone,
        String shape,
        Integer seats,
        Integer rotation
) {}
