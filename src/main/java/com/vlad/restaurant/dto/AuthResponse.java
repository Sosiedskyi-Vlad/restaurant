package com.vlad.restaurant.dto;

// tableNumber заповнений лише для гостя
public record AuthResponse(String token, String role, Integer tableNumber) {}
