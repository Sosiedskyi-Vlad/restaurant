package com.vlad.restaurant.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "promotions")
@Data
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(name = "badge_text")
    private String badgeText;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "full_content", columnDefinition = "TEXT")
    private String fullContent;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    // NONE, MENU_ITEM, CALL_WAITER
    @Column(name = "action_type", nullable = false)
    @ColumnDefault("'NONE'")
    private String actionType = "NONE";

    @Column(name = "target_menu_item_id")
    private Long targetMenuItemId;

    @Column(name = "is_active", nullable = false)
    @ColumnDefault("true")
    private boolean active = true;

    @Column(name = "display_order", nullable = false)
    @ColumnDefault("0")
    private int displayOrder = 0;

    // Відсоток знижки для чека (наприклад, 15 для 15%)
    @Column(name = "discount_percent")
    @ColumnDefault("0")
    private Integer discountPercent = 0;

    // Статистика використання акції
    @Column(name = "usage_count", nullable = false)
    @ColumnDefault("0")
    private int usageCount = 0;

    @Column(name = "total_discount_given", nullable = false, precision = 10, scale = 2)
    @ColumnDefault("0.00")
    private BigDecimal totalDiscountGiven = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
