package com.vlad.restaurant.exception;

// Конфлікт стану ресурсу (409): наприклад, недопустимий перехід статусу замовлення
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
