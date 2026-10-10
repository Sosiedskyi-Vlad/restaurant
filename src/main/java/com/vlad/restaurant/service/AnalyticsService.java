package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.AnalyticsResponse;
import com.vlad.restaurant.exception.BadRequestException;
import com.vlad.restaurant.repository.AnalyticsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final long MAX_PERIOD_DAYS = 366;

    private final AnalyticsRepository repository;

    @Transactional(readOnly = true)
    public AnalyticsResponse report(LocalDate from, LocalDate to, int topLimit) {
        if (to.isBefore(from)) {
            throw new BadRequestException("Дата \"from\" не може бути пізніше за \"to\"");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_PERIOD_DAYS) {
            throw new BadRequestException("Максимальний період - " + MAX_PERIOD_DAYS + " днів");
        }
        // Період включає обидві дати: [from 00:00; to+1 00:00)
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        BigDecimal revenue = repository.revenue(start, end).setScale(2, RoundingMode.HALF_UP);
        long paidOrders = repository.paidOrders(start, end);
        BigDecimal average = paidOrders == 0
                ? BigDecimal.ZERO.setScale(2)
                : revenue.divide(BigDecimal.valueOf(paidOrders), 2, RoundingMode.HALF_UP);

        Double seconds = repository.avgCookingSeconds(start, end);
        Double minutes = seconds == null ? null : Math.round(seconds / 60.0 * 10) / 10.0;

        List<AnalyticsResponse.TopItem> top = repository.topItems(start, end, PageRequest.of(0, topLimit));

        List<AnalyticsResponse.DailyRevenue> byDay = repository.revenueByDay(start, end).stream()
                .map(r -> new AnalyticsResponse.DailyRevenue(
                        toLocalDate(r[0]),
                        ((BigDecimal) r[1]).setScale(2, RoundingMode.HALF_UP),
                        ((Number) r[2]).longValue()))
                .toList();

        return new AnalyticsResponse(from, to, revenue, paidOrders, average, minutes, top, byDay);
    }

    // Залежно від версії Hibernate/драйвера native-запит віддає LocalDate або java.sql.Date
    private static LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate d) {
            return d;
        }
        return ((java.sql.Date) value).toLocalDate();
    }
}
