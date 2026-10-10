package com.vlad.restaurant.dto;

// Повідомлення WebSocket про виклик персоналу
public record ServiceCallEventMessage(Type type, ServiceCallResponse call) {
    public enum Type {
        CALL_CREATED,
        CALL_RESOLVED
    }
}
