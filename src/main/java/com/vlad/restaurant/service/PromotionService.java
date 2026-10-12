package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.PromotionRequest;
import com.vlad.restaurant.dto.PromotionResponse;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.Promotion;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final MenuItemRepository menuItemRepository;

    @Transactional(readOnly = true)
    public List<PromotionResponse> getActivePromotions() {
        List<Promotion> list = promotionRepository.findAllByActiveTrueOrderByDisplayOrderAscCreatedAtDesc();
        return toResponses(list);
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> getAllPromotions() {
        List<Promotion> list = promotionRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc();
        return toResponses(list);
    }

    @Transactional(readOnly = true)
    public PromotionResponse getPromotion(UUID id) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Акцію не знайдено"));
        String itemName = getItemName(p.getTargetMenuItemId());
        return PromotionResponse.from(p, itemName);
    }

    @Transactional
    public PromotionResponse createPromotion(PromotionRequest request) {
        Promotion p = new Promotion();
        mapFields(p, request);
        Promotion saved = promotionRepository.save(p);
        log.info("Створено нову акцію: {}", saved.getTitle());
        return PromotionResponse.from(saved, getItemName(saved.getTargetMenuItemId()));
    }

    @Transactional
    public PromotionResponse updatePromotion(UUID id, PromotionRequest request) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Акцію не знайдено"));
        mapFields(p, request);
        Promotion saved = promotionRepository.save(p);
        log.info("Оновлено акцію: {}", saved.getTitle());
        return PromotionResponse.from(saved, getItemName(saved.getTargetMenuItemId()));
    }

    @Transactional
    public PromotionResponse toggleActive(UUID id) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Акцію не знайдено"));
        p.setActive(!p.isActive());
        Promotion saved = promotionRepository.save(p);
        log.info("Змінено статус активності акції {} на {}", saved.getTitle(), saved.isActive());
        return PromotionResponse.from(saved, getItemName(saved.getTargetMenuItemId()));
    }

    @Transactional
    public void deletePromotion(UUID id) {
        Promotion p = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Акцію не знайдено"));
        promotionRepository.delete(p);
        log.info("Видалено акцію: {}", p.getTitle());
    }

    private void mapFields(Promotion p, PromotionRequest request) {
        p.setTitle(request.title().trim());
        p.setBadgeText(request.badgeText() != null ? request.badgeText().trim() : null);
        p.setShortDescription(request.shortDescription() != null ? request.shortDescription().trim() : null);
        p.setFullContent(request.fullContent() != null ? request.fullContent().trim() : null);
        p.setImageUrl(request.imageUrl() != null ? request.imageUrl().trim() : null);
        p.setActionType(request.actionType() != null && !request.actionType().isBlank() ? request.actionType() : "NONE");
        p.setTargetMenuItemId(request.targetMenuItemId());
        if (request.active() != null) {
            p.setActive(request.active());
        }
        if (request.displayOrder() != null) {
            p.setDisplayOrder(request.displayOrder());
        }
    }

    private List<PromotionResponse> toResponses(List<Promotion> list) {
        List<Long> itemIds = list.stream()
                .map(Promotion::getTargetMenuItemId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        Map<Long, String> itemNames = menuItemRepository.findAllById(itemIds).stream()
                .collect(Collectors.toMap(MenuItem::getId, MenuItem::getName));

        return list.stream()
                .map(p -> PromotionResponse.from(p, p.getTargetMenuItemId() != null ? itemNames.get(p.getTargetMenuItemId()) : null))
                .toList();
    }

    private String getItemName(Long itemId) {
        if (itemId == null) return null;
        return menuItemRepository.findById(itemId)
                .map(MenuItem::getName)
                .orElse(null);
    }
}
