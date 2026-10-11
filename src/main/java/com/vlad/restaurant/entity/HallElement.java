package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Table(name = "hall_elements")
@Data
public class HallElement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // BAR, KITCHEN, ENTRANCE, WC, WALL, PLANT

    @Column(nullable = false)
    private String zone = "MAIN";

    @Column(name = "position_x", nullable = false)
    private Double positionX;

    @Column(name = "position_y", nullable = false)
    private Double positionY;

    private Double width = 16.0;

    private Double height = 10.0;

    private Integer rotation = 0;
}
