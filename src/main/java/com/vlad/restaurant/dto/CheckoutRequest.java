package com.vlad.restaurant.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CheckoutRequest(@NotNull(message = "orderId обов'язковий") UUID orderId) {}
