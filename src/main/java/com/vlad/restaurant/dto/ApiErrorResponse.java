package com.vlad.restaurant.dto;

import java.time.LocalDateTime;

public record ApiErrorResponse(
        int status,          // HTTP статус (наприклад, 404)
        String error,        // Коротка назва (наприклад, "Not Found")
        String message,      // Детальний опис (наприклад, "Страву з ID 5 не знайдено")
        LocalDateTime timestamp // Точний час помилки
) {}