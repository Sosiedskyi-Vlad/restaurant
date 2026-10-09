package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders") // "order" - зарезервоване слово в SQL, тому пишемо "orders"
@Data
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "table_number")
    private Integer tableNumber; // Для простоти поки будемо передавати номер стола числом

    private String status = "NEW"; // Статуси: NEW, PREPARING, READY, PAID

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Магія зв'язків: Одне замовлення -> Багато позицій
    // cascade = CascadeType.ALL означає, що якщо ми зберігаємо Order, Spring сам збереже всі його OrderItem
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items = new ArrayList<>();
}