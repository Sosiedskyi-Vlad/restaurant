package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

@Entity
@Table(name = "categories")
@BatchSize(size = 50)
@Getter
@Setter
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name; // Наприклад: "Напої", "Десерти"

    // М'яке видалення
    @Column(name = "is_active")
    private boolean active = true;
}
