package com.vlad.restaurant.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// Звіт для адміністратора за період [from; to] включно
public record AnalyticsResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal revenue,          // виручка: сума оплачених замовлень
        long paidOrders,             // кількість оплачених замовлень
        BigDecimal averageCheck,     // виручка / кількість оплачених замовлень
        Double avgCookingMinutes,    // середній час NEW -> READY; null, якщо немає даних
        List<TopItem> topItems,
        List<DailyRevenue> revenueByDay
) {
    public record TopItem(Long menuItemId, String name, long quantity, BigDecimal revenue) {}

    public record DailyRevenue(LocalDate date, BigDecimal revenue, long orders) {}
}
