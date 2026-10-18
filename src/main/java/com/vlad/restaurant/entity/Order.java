package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// @Getter/@Setter замість @Data: двосторонній зв'язок Order <-> OrderItem
// з @Data призводить до нескінченної рекурсії в toString()/hashCode()
@Entity
@Table(name = "orders") // "order" - зарезервоване слово в SQL
@Getter
@Setter
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Зв'язок із фізичним столом. У БД nullable лише заради старих тестових замовлень
    // (до міграції на FK було просто число); OrderService завжди заповнює це поле.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id")
    private RestaurantTable table;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.NEW;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Часові мітки життєвого циклу - основа аналітики (час приготування, виручка за період)
    @Column(name = "preparing_at")
    private LocalDateTime preparingAt;

    @Column(name = "ready_at")
    private LocalDateTime readyAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    // Чи оплачене замовлення (онлайн або готівкою). Не залежить від статусу готовності:
    // гість може оплатити наперед, поки замовлення ще готується.
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean paid = false;

    // Знижка за акцією
    @Column(name = "discount_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_promotion_id")
    private Promotion appliedPromotion;

    @Column(name = "applied_promotion_title")
    private String appliedPromotionTitle;

    @BatchSize(size = 50)
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();
}
