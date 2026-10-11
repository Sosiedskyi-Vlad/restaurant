package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.HallElement;
import java.util.UUID;

public record HallElementDto(
        UUID id,
        String name,
        String type,
        String zone,
        Double positionX,
        Double positionY,
        Double width,
        Double height,
        Integer rotation
) {
    public static HallElementDto from(HallElement e) {
        return new HallElementDto(
                e.getId(),
                e.getName(),
                e.getType(),
                e.getZone() != null ? e.getZone() : "MAIN",
                e.getPositionX(),
                e.getPositionY(),
                e.getWidth() != null ? e.getWidth() : 16.0,
                e.getHeight() != null ? e.getHeight() : 10.0,
                e.getRotation() != null ? e.getRotation() : 0
        );
    }
}
