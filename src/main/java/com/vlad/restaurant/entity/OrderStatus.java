package com.vlad.restaurant.entity;

public enum OrderStatus {
    NEW,        // Щойно створене гостем
    PREPARING,  // Кухар прийняв у роботу
    READY,      // Готове до видачі
    PAID        // Оплачене / закрите
}
