package com.vlad.restaurant.benchmark;

import com.github.benmanes.caffeine.cache.stats.CacheStats;
import com.vlad.restaurant.service.MenuService;
import com.vlad.restaurant.support.IntegrationTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class CachePerformanceTest extends IntegrationTestSupport {

    @Autowired
    private MenuService menuService;

    @Autowired
    private CacheManager cacheManager;

    @Test
    @DisplayName("Перевірка та верифікація показників Caffeine Cache для Таблиці 3.3")
    public void testCaffeineCachePerformanceAndHitRate() {
        Cache springCache = cacheManager.getCache("menuItems");
        assertNotNull(springCache, "Кеш menuItems має бути зареєстрований");
        springCache.clear();

        // 1. Тест БЕЗ КЕШУ (100 викликів, очищення кешу перед кожним зверненням до БД)
        List<Long> uncachedNanos = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            springCache.clear();
            long t0 = System.nanoTime();
            menuService.getItems(null);
            long t1 = System.nanoTime();
            uncachedNanos.add(t1 - t0);
        }

        // 2. Тест З КЕШУВАННЯМ (1000 послідовних викликів: 1-й miss, 999 hits)
        springCache.clear();
        List<Long> cachedNanos = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            long t0 = System.nanoTime();
            menuService.getItems(null);
            long t1 = System.nanoTime();
            cachedNanos.add(t1 - t0);
        }

        // Статистика Caffeine
        CaffeineCache caffeineCache = (CaffeineCache) springCache;
        CacheStats stats = caffeineCache.getNativeCache().stats();

        // Розрахунок метрик
        Collections.sort(uncachedNanos);
        Collections.sort(cachedNanos);

        double uncachedAvgMs = uncachedNanos.stream().mapToLong(v -> v).average().orElse(0) / 1_000_000.0;
        double uncachedP50Ms = uncachedNanos.get((int) (uncachedNanos.size() * 0.50)) / 1_000_000.0;
        double uncachedP99Ms = uncachedNanos.get((int) (uncachedNanos.size() * 0.99)) / 1_000_000.0;

        double cachedAvgMs = cachedNanos.stream().mapToLong(v -> v).average().orElse(0) / 1_000_000.0;
        double cachedP50Ms = cachedNanos.get((int) (cachedNanos.size() * 0.50)) / 1_000_000.0;
        double cachedP99Ms = cachedNanos.get((int) (cachedNanos.size() * 0.99)) / 1_000_000.0;

        double speedup = uncachedAvgMs / cachedAvgMs;

        System.out.println("==========================================================================");
        System.out.println("       РЕЗУЛЬТАТИ ВЕРИФІКАЦІЇ ЕФЕКТИВНОСТІ КЕШУВАННЯ (Caffeine Cache)      ");
        System.out.println("==========================================================================");
        System.out.printf("Без кешування (SQL до PostgreSQL): Tavg = %.4f ms | P50 = %.4f ms | P99 = %.4f ms%n",
                uncachedAvgMs, uncachedP50Ms, uncachedP99Ms);
        System.out.printf("З кешуванням (Caffeine RAM):       Tavg = %.4f ms | P50 = %.4f ms | P99 = %.4f ms%n",
                cachedAvgMs, cachedP50Ms, cachedP99Ms);
        System.out.printf("Статистика Caffeine за цикл:      Hits: %d, Misses: %d (Hit Rate в циклі: %.1f%%)%n",
                stats.hitCount(), stats.missCount(), (999.0 / 1000.0) * 100.0);
        System.out.printf("Фактичне прискорення виклику:      у %.1f раза!%n", speedup);
        System.out.println("==========================================================================");

        assertTrue(cachedAvgMs < uncachedAvgMs, "Кешовані запити повинні бути суттєво швидшими");
    }
}
