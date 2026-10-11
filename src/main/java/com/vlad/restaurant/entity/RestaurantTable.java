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
    private String qrCodeHash;

    @Column(name = "position_x")
    private Double positionX;

    @Column(name = "position_y")
    private Double positionY;

    @Column(name = "zone")
    private String zone = "MAIN"; // MAIN, TERRACE, VIP, etc.

    @Column(name = "shape")
    private String shape = "SQUARE"; // SQUARE, ROUND, RECTANGLE

    @Column(name = "seats")
    private Integer seats = 4; // 2, 4, 6, 8...

    @Column(name = "rotation")
    private Integer rotation = 0; // 0, 45, 90, 180...
}
