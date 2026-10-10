package com.vlad.restaurant.event;

import com.vlad.restaurant.dto.OrderEventMessage;

import java.util.UUID;

// Внутрішня подія застосунку. Публікується в OrderService всередині транзакції,
// а розсилається клієнтам лише ПІСЛЯ коміту (див. OrderEventListener).
public record OrderEvent(UUID tableId, OrderEventMessage message) {
}
