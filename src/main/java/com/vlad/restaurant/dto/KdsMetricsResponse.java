package com.vlad.restaurant.dto;

public record KdsMetricsResponse(
        long activeOrders,
        long preparingOrders,
        long readyOrders,
        long completedToday,
        long delayedOrders,
        Double avgCookingMinutesToday,
        long totalDishesToday
) {}
