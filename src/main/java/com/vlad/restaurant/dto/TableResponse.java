package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.RestaurantTable;

import java.util.UUID;

public record TableResponse(UUID id, Integer number, String qrCodeHash, Double positionX, Double positionY) {
    public static TableResponse from(RestaurantTable t) {
        return new TableResponse(t.getId(), t.getNumber(), t.getQrCodeHash(), t.getPositionX(), t.getPositionY());
    }
}
