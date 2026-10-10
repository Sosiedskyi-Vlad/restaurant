package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.Payment;
import com.vlad.restaurant.entity.PaymentStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentResponse(UUID id, UUID orderId, PaymentStatus status, BigDecimal amount, String currency) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(p.getId(), p.getOrder().getId(), p.getStatus(), p.getAmount(), p.getCurrency());
    }
}
