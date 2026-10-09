package com.vlad.restaurant.exception;

// Наслідуємося від RuntimeException, щоб не писати throws у кожному методі
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}