package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

// Спроба онлайн-оплати замовлення. id цього запису передається в LiqPay як order_id,
// тож одне замовлення може мати кілька спроб (перша не вдалась - гість пробує знову).
@Entity
@Table(name = "payments")
@Getter
@Setter
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    // Сума фіксується в момент створення платежу; callback з іншою сумою відхиляється
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    // Сирий статус від LiqPay (success, sandbox, failure, wait_accept ...) - для відлагодження
    @Column(name = "provider_status")
    private String providerStatus;

    @Column(name = "provider_payment_id")
    private String providerPaymentId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
