package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.Promotion;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PromotionResponse(
        UUID id,
        String title,
        String badgeText,
        String shortDescription,
        String fullContent,
        String imageUrl,
        String actionType,
        Long targetMenuItemId,
        String targetMenuItemName,
        boolean active,
        boolean showInSlider,
        int displayOrder,
        Integer discountPercent,
        int usageCount,
        BigDecimal totalDiscountGiven,
        LocalDateTime createdAt,
        String promoType,
        String comboConfig
) {
    public static PromotionResponse from(Promotion p, String menuItemName) {
        return new PromotionResponse(
                p.getId(),
                p.getTitle(),
                p.getBadgeText(),
                p.getShortDescription(),
                p.getFullContent(),
                p.getImageUrl(),
                p.getActionType() != null ? p.getActionType() : "NONE",
                p.getTargetMenuItemId(),
                menuItemName,
                p.isActive(),
                p.isShowInSlider(),
                p.getDisplayOrder(),
                p.getDiscountPercent() != null ? p.getDiscountPercent() : 0,
                p.getUsageCount(),
                p.getTotalDiscountGiven() != null ? p.getTotalDiscountGiven() : BigDecimal.ZERO,
                p.getCreatedAt(),
                p.getPromoType() != null ? p.getPromoType() : "ORDER_PERCENT",
                p.getComboConfig()
        );
    }
}
