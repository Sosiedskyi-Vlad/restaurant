package com.vlad.restaurant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "restaurant_info")
@Getter
@Setter
public class RestaurantInfo {

    @Id
    private Long id = 1L;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "wifi_ssid", length = 100)
    private String wifiSsid;

    @Column(name = "wifi_password", length = 100)
    private String wifiPassword;

    @Column(name = "working_hours", length = 100)
    private String workingHours;

    @Column(length = 200)
    private String address;

    @Column(length = 50)
    private String phone;

    @Column(name = "allergens_note", columnDefinition = "TEXT")
    private String allergensNote;

    private Double latitude;

    private Double longitude;
}
