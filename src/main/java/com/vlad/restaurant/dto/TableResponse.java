package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.RestaurantTable;

import java.util.UUID;

public record TableResponse(
        UUID id,
        Integer number,
        String qrCodeHash,
        Double positionX,
        Double positionY,
        String zone,
        String shape,
        Integer seats,
        Integer rotation
) {
    public static TableResponse from(RestaurantTable t) {
        return new TableResponse(
                t.getId(),
                t.getNumber(),
                t.getQrCodeHash(),
                t.getPositionX(),
                t.getPositionY(),
                t.getZone() != null ? t.getZone() : "MAIN",
                t.getShape() != null ? t.getShape() : "SQUARE",
                t.getSeats() != null ? t.getSeats() : 4,
                t.getRotation() != null ? t.getRotation() : 0
        );
    }
}
