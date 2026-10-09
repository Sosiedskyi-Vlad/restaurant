package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "categories")
@Data
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name; // Наприклад: "Напої", "Десерти"

    // М'яке видалення
    @Column(name = "is_active")
    private boolean active = true;
}
