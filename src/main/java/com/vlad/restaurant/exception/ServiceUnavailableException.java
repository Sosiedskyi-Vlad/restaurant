package com.vlad.restaurant.exception;

// Зовнішня залежність (наприклад, платіжний провайдер) недоступна або не налаштована
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}
