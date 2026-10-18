package com.vlad.restaurant.repository;

import com.vlad.restaurant.dto.AnalyticsResponse;
import com.vlad.restaurant.entity.Order;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// Агрегуючі запити для звітів. Усі працюють по оплачених замовленнях у періоді [from; to).
@Repository
public interface AnalyticsRepository extends JpaRepository<Order, UUID> {

    // Чистий виторг з урахуванням застосованих знижок (discount_amount) по кожному чеку
    @Query(value = """
            select coalesce(sum(
                greatest(
                    coalesce((select sum(i.price_at_time * i.quantity) from order_items i where i.order_id = o.id), 0)
                    - coalesce(o.discount_amount, 0),
                    0
                )
            ), 0)
            from orders o
            where o.paid = true and o.paid_at >= :from and o.paid_at < :to
            """, nativeQuery = true)
    BigDecimal revenue(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("select count(o) from Order o where o.paid = true and o.paidAt >= :from and o.paidAt < :to")
    long paidOrders(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
            select coalesce(sum(i.quantity), 0)
            from OrderItem i join i.order o
            where (o.paid = true and o.paidAt >= :from and o.paidAt < :to)
               or (o.readyAt is not null and o.readyAt >= :from and o.readyAt < :to)
            """)
    long totalDishesCooked(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
            select new com.vlad.restaurant.dto.AnalyticsResponse$TopItem(
                m.id, m.name, sum(i.quantity), sum(i.priceAtTime * i.quantity))
            from OrderItem i join i.order o join i.menuItem m
            where o.paid = true and o.paidAt >= :from and o.paidAt < :to
            group by m.id, m.name
            order by sum(i.quantity) desc, sum(i.priceAtTime * i.quantity) desc
            """)
    List<AnalyticsResponse.TopItem> topItems(@Param("from") LocalDateTime from,
                                             @Param("to") LocalDateTime to,
                                             Pageable pageable);

    // Різниця між створенням (NEW) і готовністю (READY), у секундах
    @Query(value = """
            select avg(extract(epoch from (o.ready_at - o.created_at)))
            from orders o
            where o.ready_at is not null and o.ready_at >= :from and o.ready_at < :to
            """, nativeQuery = true)
    Double avgCookingSeconds(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Рядки: [дата (java.sql.Date), чиста виручка з урахуванням знижок, кількість замовлень]
    @Query(value = """
            select cast(o.paid_at as date) as day,
                   coalesce(sum(
                       greatest(
                           coalesce((select sum(i.price_at_time * i.quantity) from order_items i where i.order_id = o.id), 0)
                           - coalesce(o.discount_amount, 0),
                           0
                       )
                   ), 0) as revenue,
                   count(o.id) as orders
            from orders o
            where o.paid = true and o.paid_at >= :from and o.paid_at < :to
            group by cast(o.paid_at as date)
            order by day
            """, nativeQuery = true)
    List<Object[]> revenueByDay(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Різниця між створенням і вирішенням виклику, у секундах
    @Query(value = """
            select avg(extract(epoch from (s.resolved_at - s.created_at)))
            from service_calls s
            where s.resolved_at is not null and s.resolved_at >= :from and s.resolved_at < :to
            """, nativeQuery = true)
    Double avgWaiterReactionSeconds(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
