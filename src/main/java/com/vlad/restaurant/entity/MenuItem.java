package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

@Entity
@Table(name = "menu_items")
@Data
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "image_url")
    private String imageUrl;

    // Стоп-лист: false = страви немає на кухні
    @Column(name = "is_available")
    private boolean available = true;

    // М'яке видалення: false = страва "видалена", але старі замовлення на неї посилаються
    @Column(name = "is_active", nullable = false)
    @ColumnDefault("true")
    private boolean active = true;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;
}
