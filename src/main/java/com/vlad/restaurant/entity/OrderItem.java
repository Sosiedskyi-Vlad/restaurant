package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_items")
@Data
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Багато позицій належать одному замовленню
    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    // Посилання на страву з меню
    @ManyToOne
    @JoinColumn(name = "menu_item_id")
    private MenuItem menuItem;

    private Integer quantity;

    @Column(name = "price_at_time")
    private BigDecimal priceAtTime; // Фіксуємо ціну, щоб старі чеки не мінялися, якщо завтра ціна в меню зросте
}