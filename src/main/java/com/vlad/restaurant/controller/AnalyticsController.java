package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.AnalyticsResponse;
import com.vlad.restaurant.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private final AnalyticsService service;

    // Приклад: GET /api/v1/admin/analytics?from=2026-10-01&to=2026-10-31&topLimit=5
    // За замовчуванням - останні 30 днів
    @GetMapping
    public AnalyticsResponse report(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") int topLimit
    ) {
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(29);
        return service.report(start, end, Math.max(1, Math.min(topLimit, 100)));
    }
}
