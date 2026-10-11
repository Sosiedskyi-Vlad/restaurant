package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.RestaurantInfo;

public record RestaurantInfoResponse(
        Long id,
        String name,
        String description,
        String wifiSsid,
        String wifiPassword,
        String workingHours,
        String address,
        String phone,
        String allergensNote,
        Double latitude,
        Double longitude
) {
    public static RestaurantInfoResponse from(RestaurantInfo info) {
        if (info == null) return null;
        return new RestaurantInfoResponse(
                info.getId(),
                info.getName(),
                info.getDescription(),
                info.getWifiSsid(),
                info.getWifiPassword(),
                info.getWorkingHours(),
                info.getAddress(),
                info.getPhone(),
                info.getAllergensNote(),
                info.getLatitude(),
                info.getLongitude()
        );
    }
}
