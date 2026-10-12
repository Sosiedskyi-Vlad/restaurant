package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.PromotionRequest;
import com.vlad.restaurant.dto.PromotionResponse;
import com.vlad.restaurant.service.PromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/promotions")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;

    // Публічний список активних акцій для гостей та каруселі меню
    @GetMapping("/active")
    public List<PromotionResponse> getActivePromotions() {
        return promotionService.getActivePromotions();
    }

    // Повний список для адмін-панелі
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<PromotionResponse> getAllPromotions() {
        return promotionService.getAllPromotions();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PromotionResponse getPromotion(@PathVariable UUID id) {
        return promotionService.getPromotion(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public PromotionResponse createPromotion(@Valid @RequestBody PromotionRequest request) {
        return promotionService.createPromotion(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public PromotionResponse updatePromotion(
            @PathVariable UUID id,
            @Valid @RequestBody PromotionRequest request
    ) {
        return promotionService.updatePromotion(id, request);
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public PromotionResponse toggleActive(@PathVariable UUID id) {
        return promotionService.toggleActive(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deletePromotion(@PathVariable UUID id) {
        promotionService.deletePromotion(id);
    }
}
