package com.vlad.restaurant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RestaurantInfoRequest(
        @NotBlank(message = "Назва закладу не може бути порожньою")
        @Size(max = 150, message = "Назва закладу не довша за 150 символів")
        String name,

        @Size(max = 255, message = "Опис не довший за 255 символів")
        String description,

        @Size(max = 100, message = "Назва Wi-Fi не довша за 100 символів")
        String wifiSsid,

        @Size(max = 100, message = "Пароль Wi-Fi не довший за 100 символів")
        String wifiPassword,

        @Size(max = 100, message = "Графік роботи не довший за 100 символів")
        String workingHours,

        @Size(max = 200, message = "Адреса не довша за 200 символів")
        String address,

        @Size(max = 50, message = "Телефон не довший за 50 символів")
        String phone,

        String allergensNote,
        Double latitude,
        Double longitude
) {}
