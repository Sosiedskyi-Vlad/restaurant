package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

// Запит гостя до персоналу: виклик офіціанта або прохання принести рахунок
@Entity
@Table(name = "service_calls")
@Getter
@Setter
public class ServiceCall {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "table_id")
    private RestaurantTable table;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceCallType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceCallStatus status = ServiceCallStatus.OPEN;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
