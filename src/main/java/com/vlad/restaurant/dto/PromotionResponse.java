package com.vlad.restaurant.dto;

import com.vlad.restaurant.entity.Promotion;

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
        int displayOrder,
        LocalDateTime createdAt
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
                p.getDisplayOrder(),
                p.getCreatedAt()
        );
    }
}
