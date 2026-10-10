package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.ServiceCallType;
import jakarta.validation.constraints.NotNull;

// tableId навмисно відсутній: береться з JWT гостя
public record ServiceCallRequest(@NotNull(message = "type обов'язковий") ServiceCallType type) {}
