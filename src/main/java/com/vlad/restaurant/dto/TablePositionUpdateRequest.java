package com.vlad.restaurant.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record TablePositionUpdateRequest(
        @NotNull UUID id,
        Double positionX,
        Double positionY,
        String zone,
        String shape,
        Integer seats,
        Integer rotation
) {}
