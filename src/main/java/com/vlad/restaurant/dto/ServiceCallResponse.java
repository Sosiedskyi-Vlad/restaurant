package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.ServiceCall;
import com.vlad.restaurant.entity.ServiceCallStatus;
import com.vlad.restaurant.entity.ServiceCallType;

import java.time.LocalDateTime;
import java.util.UUID;

public record ServiceCallResponse(
        UUID id,
        Integer tableNumber,
        ServiceCallType type,
        ServiceCallStatus status,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {
    public static ServiceCallResponse from(ServiceCall c) {
        return new ServiceCallResponse(c.getId(), c.getTable().getNumber(), c.getType(),
                c.getStatus(), c.getCreatedAt(), c.getResolvedAt());
    }
}
