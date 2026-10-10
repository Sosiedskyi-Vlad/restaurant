package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.*;
import com.vlad.restaurant.service.MenuService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

import java.util.List;

// GET - для будь-якого авторизованого користувача (гість / персонал).
// Усе, що змінює меню, - лише ADMIN.
@RestController
@RequestMapping("/api/v1/menu")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    // ---------- Категорії ----------

    @GetMapping("/categories")
    public List<CategoryResponse> getCategories() {
        return menuService.getActiveCategories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse createCategory(@Valid @RequestBody CategoryRequest request) {
        return menuService.createCategory(request);
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse updateCategory(@PathVariable Integer id, @Valid @RequestBody CategoryRequest request) {
        return menuService.updateCategory(id, request);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteCategory(@PathVariable Integer id) {
        menuService.deleteCategory(id);
    }

    // ---------- Страви ----------

    @GetMapping("/items")
    public List<MenuItemResponse> getItems(@RequestParam(required = false) Integer categoryId) {
        return menuService.getItems(categoryId);
    }

    @GetMapping("/items/{id}")
    public MenuItemResponse getItem(@PathVariable Long id) {
        return menuService.getItem(id);
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public MenuItemResponse createItem(@Valid @RequestBody MenuItemRequest request) {
        return menuService.createItem(request);
    }

    @PutMapping("/items/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public MenuItemResponse updateItem(@PathVariable Long id, @Valid @RequestBody MenuItemRequest request) {
        return menuService.updateItem(id, request);
    }

    @PatchMapping("/items/{id}/availability")
    @PreAuthorize("hasRole('ADMIN')")
    public MenuItemResponse setAvailability(@PathVariable Long id, @Valid @RequestBody AvailabilityRequest request) {
        return menuService.setAvailability(id, request.isAvailable());
    }

    @DeleteMapping("/items/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteItem(@PathVariable Long id) {
        menuService.deleteItem(id);
    }

    @PostMapping("/items/{id}/like")
    @ResponseStatus(HttpStatus.OK)
    public void likeItem(@PathVariable Long id) {
        menuService.likeItem(id);
    }

    @DeleteMapping("/items/{id}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlikeItem(@PathVariable Long id) {
        menuService.unlikeItem(id);
    }

    @PostMapping(value = "/items/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public MenuItemResponse uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return menuService.uploadImage(id, file);
    }
}
