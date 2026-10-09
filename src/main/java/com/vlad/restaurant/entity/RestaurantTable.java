package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Table(name = "restaurant_tables")
@Data
public class RestaurantTable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private Integer number; // Номер стола для офіціанта (1, 2, 3...)

    @Column(name = "qr_code_hash", unique = true)
    private String qrCodeHash; // Унікальний хеш, який буде зашитий в QR-код на столі
}