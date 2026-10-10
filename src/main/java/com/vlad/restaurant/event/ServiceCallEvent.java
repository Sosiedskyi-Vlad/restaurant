package com.vlad.restaurant.event;

import com.vlad.restaurant.dto.ServiceCallEventMessage;

import java.util.UUID;

// Публікується всередині транзакції, розсилається після коміту (див. ServiceCallEventListener)
public record ServiceCallEvent(UUID tableId, ServiceCallEventMessage message) {
}
