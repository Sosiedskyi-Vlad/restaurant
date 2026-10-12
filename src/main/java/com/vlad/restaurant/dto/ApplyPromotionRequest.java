package com.vlad.restaurant.dto;

import java.util.UUID;

public record ApplyPromotionRequest(
        UUID promotionId
) {
}
