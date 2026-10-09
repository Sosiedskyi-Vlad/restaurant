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

    @Column(name = "is_active")
    private boolean isActive = true;
}