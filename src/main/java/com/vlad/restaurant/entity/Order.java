package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

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

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();
}
