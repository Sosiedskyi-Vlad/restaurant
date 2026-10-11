package com.vlad.restaurant.entity;

public enum OrderItemStatus {
    NEW,        // Щойно створене, очікує приготування
    PREPARING,  // Готується кухарем або барменом
    READY,      // Готово до видачі (можна нести гостю)
    SERVED      // Видано гостю за стіл
}
