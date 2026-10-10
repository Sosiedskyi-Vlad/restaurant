package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.*;
import com.vlad.restaurant.entity.Category;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.CategoryRepository;
import com.vlad.restaurant.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.vlad.restaurant.exception.BadRequestException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuItemRepository itemRepository;
    private final CategoryRepository categoryRepository;

    // ---------- Категорії ----------

    @Transactional(readOnly = true)
    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findAllByActiveTrueOrderByIdAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        Category category = new Category();
        category.setName(request.name().trim());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse updateCategory(Integer id, CategoryRequest request) {
        Category category = findActiveCategory(id);
        category.setName(request.name().trim());
        return CategoryResponse.from(category); // зміни збережуться автоматично (dirty checking)
    }

    // М'яке видалення. Страви категорії зникають з меню, бо фільтруються за category.active
    @Transactional
    public void deleteCategory(Integer id) {
        findActiveCategory(id).setActive(false);
    }

    // ---------- Страви ----------

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

    @Transactional
    public MenuItemResponse createItem(MenuItemRequest request) {
        MenuItem item = new MenuItem();
        apply(item, request);
        return MenuItemResponse.from(itemRepository.save(item));
    }

    @Transactional
    public MenuItemResponse updateItem(Long id, MenuItemRequest request) {
        MenuItem item = findActiveItem(id);
        apply(item, request);
        return MenuItemResponse.from(item);
    }

    // Швидке керування стоп-листом
    @Transactional
    public MenuItemResponse setAvailability(Long id, boolean available) {
        MenuItem item = findActiveItem(id);
        item.setAvailable(available);
        return MenuItemResponse.from(item);
    }

    // М'яке видалення: рядок лишається в БД, бо на нього посилаються старі замовлення
    @Transactional
    public void deleteItem(Long id) {
        findActiveItem(id).setActive(false);
    }

    @Transactional
    public void likeItem(Long id) {
        MenuItem item = findActiveItem(id);
        item.setFavoritesCount(item.getFavoritesCount() + 1);
    }

    // ---------- Допоміжні ----------

    private void apply(MenuItem item, MenuItemRequest request) {
        item.setName(request.name().trim());
        item.setPrice(request.price().setScale(2, RoundingMode.HALF_UP));
        item.setImageUrl(request.imageUrl() == null || request.imageUrl().isBlank() ? null : request.imageUrl().trim());
        item.setIngredients(request.ingredients());
        item.setAllergens(request.allergens());
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

    @Transactional
    public MenuItemResponse uploadImage(Long id, MultipartFile file) {
        MenuItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Страву не знайдено"));
                
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/jpg"))) {
            throw new BadRequestException("Дозволені лише формати JPG та PNG");
        }
        
        try {
            Path uploadDir = Paths.get("uploads");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            
            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename().replaceAll("[^a-zA-Z0-9\\.\\-]", "_");
            Path filePath = uploadDir.resolve(filename).toAbsolutePath();
            file.transferTo(filePath.toFile());
            
            item.setImageUrl("/uploads/" + filename);
            return MenuItemResponse.from(itemRepository.save(item));
        } catch (IOException e) {
            throw new RuntimeException("Не вдалося зберегти файл", e);
        }
    }
}
