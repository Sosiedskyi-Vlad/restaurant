package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.*;
import com.vlad.restaurant.entity.Category;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.CategoryRepository;
import com.vlad.restaurant.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuItemRepository itemRepository;
    private final CategoryRepository categoryRepository;
    private final FileStorageService fileStorageService;
    private final CacheManager cacheManager;

    // ---------- Категорії ----------

    @Cacheable("categories")
    @Transactional(readOnly = true)
    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findAllByActiveTrueOrderByIdAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @CacheEvict(value = "categories", allEntries = true)
    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        Category category = new Category();
        category.setName(request.name().trim());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Caching(evict = {
        @CacheEvict(value = "categories", allEntries = true),
        @CacheEvict(value = "menuItems", allEntries = true)
    })
    @Transactional
    public CategoryResponse updateCategory(Integer id, CategoryRequest request) {
        Category category = findActiveCategory(id);
        category.setName(request.name().trim());
        return CategoryResponse.from(category); // зміни збережуться автоматично (dirty checking)
    }

    // М'яке видалення. Страви категорії зникають з меню, бо фільтруються за category.active
    @Caching(evict = {
        @CacheEvict(value = "categories", allEntries = true),
        @CacheEvict(value = "menuItems", allEntries = true)
    })
    @Transactional
    public void deleteCategory(Integer id) {
        findActiveCategory(id).setActive(false);
    }

    // ---------- Страви ----------

    @Cacheable(value = "menuItems", key = "#categoryId != null ? #categoryId : 'ALL'")
    @Transactional(readOnly = true)
    public List<MenuItemResponse> getItems(Integer categoryId) {
        List<MenuItem> items = categoryId == null
                ? itemRepository.findAllByActiveTrueAndCategoryActiveTrue()
                : itemRepository.findAllByActiveTrueAndCategoryActiveTrueAndCategoryId(categoryId);
        return items.stream().map(MenuItemResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public MenuItemResponse getItem(Long id) {
        return MenuItemResponse.from(findActiveItem(id));
    }

    @CacheEvict(value = "menuItems", allEntries = true)
    @Transactional
    public MenuItemResponse createItem(MenuItemRequest request) {
        MenuItem item = new MenuItem();
        apply(item, request);
        return MenuItemResponse.from(itemRepository.save(item));
    }

    @CacheEvict(value = "menuItems", allEntries = true)
    @Transactional
    public MenuItemResponse updateItem(Long id, MenuItemRequest request) {
        MenuItem item = findActiveItem(id);
        apply(item, request);
        return MenuItemResponse.from(item);
    }

    // Швидке керування стоп-листом
    @CacheEvict(value = "menuItems", allEntries = true)
    @Transactional
    public MenuItemResponse setAvailability(Long id, boolean available) {
        MenuItem item = findActiveItem(id);
        item.setAvailable(available);
        return MenuItemResponse.from(item);
    }

    // М'яке видалення: рядок лишається в БД, бо на нього посилаються старі замовлення
    @CacheEvict(value = "menuItems", allEntries = true)
    @Transactional
    public void deleteItem(Long id) {
        findActiveItem(id).setActive(false);
    }

    // Атомарне оновлення лічильника популярності без скидання всього кешу меню (захист від Cache Thrashing)
    @Transactional
    public void likeItem(Long id) {
        int updated = itemRepository.incrementFavoritesCount(id);
        if (updated == 0) {
            throw new ResourceNotFoundException("Страву з ID " + id + " не знайдено");
        }
        updateCachedFavoritesCount(id, 1);
    }

    @Transactional
    public void unlikeItem(Long id) {
        int updated = itemRepository.decrementFavoritesCount(id);
        if (updated == 0) {
            throw new ResourceNotFoundException("Страву з ID " + id + " не знайдено");
        }
        updateCachedFavoritesCount(id, -1);
    }

    private void updateCachedFavoritesCount(Long itemId, int delta) {
        Cache cache = cacheManager.getCache("menuItems");
        if (cache instanceof CaffeineCache caffeineCache) {
            caffeineCache.getNativeCache().asMap().replaceAll((key, value) -> {
                if (value instanceof List<?> list) {
                    return list.stream()
                            .map(elem -> {
                                if (elem instanceof MenuItemResponse resp && itemId.equals(resp.id())) {
                                    int current = resp.favoritesCount() != null ? resp.favoritesCount() : 0;
                                    return new MenuItemResponse(
                                            resp.id(),
                                            resp.name(),
                                            resp.price(),
                                            resp.imageUrl(),
                                            resp.ingredients(),
                                            resp.allergens(),
                                            resp.variations(),
                                            Math.max(0, current + delta),
                                            resp.isAvailable(),
                                            resp.categoryId(),
                                            resp.categoryName()
                                    );
                                }
                                return elem;
                            })
                            .toList();
                }
                return value;
            });
        }
    }

    // ---------- Допоміжні ----------

    private void apply(MenuItem item, MenuItemRequest request) {
        item.setName(request.name().trim());
        item.setPrice(request.price().setScale(2, RoundingMode.HALF_UP));
        item.setImageUrl(request.imageUrl() == null || request.imageUrl().isBlank() ? null : request.imageUrl().trim());
        item.setIngredients(request.ingredients());
        item.setAllergens(request.allergens());
        item.setVariations(request.variations());
        item.setCategory(findActiveCategory(request.categoryId()));
    }

    private Category findActiveCategory(Integer id) {
        return categoryRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Категорію з ID " + id + " не знайдено"));
    }

    private MenuItem findActiveItem(Long id) {
        return itemRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Страву з ID " + id + " не знайдено"));
    }

    @CacheEvict(value = "menuItems", allEntries = true)
    @Transactional
    public MenuItemResponse uploadImage(Long id, MultipartFile file) {
        MenuItem item = findActiveItem(id);
        String oldImageUrl = item.getImageUrl();
        String newImageUrl = fileStorageService.storeImage(file, "menu");
        item.setImageUrl(newImageUrl);
        MenuItemResponse response = MenuItemResponse.from(itemRepository.save(item));
        fileStorageService.deleteLocalImageIfPresent(oldImageUrl);
        return response;
    }
}
