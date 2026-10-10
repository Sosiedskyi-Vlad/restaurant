package com.vlad.restaurant.exception;

// Бізнес-помилка клієнта (400): наприклад, страва у стоп-листі
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
