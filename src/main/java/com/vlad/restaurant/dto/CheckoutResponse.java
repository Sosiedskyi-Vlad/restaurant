package com.vlad.restaurant.dto;

import java.math.BigDecimal;
import java.util.UUID;

// Фронтенд робить HTML-форму: POST на checkoutUrl з полями data та signature
// (або редірект), після чого LiqPay показує гостю сторінку оплати.
public record CheckoutResponse(
        UUID paymentId,
        String checkoutUrl,
        String data,
        String signature,
        BigDecimal amount,
        String currency
) {}
