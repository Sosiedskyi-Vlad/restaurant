package com.vlad.restaurant.controller;

import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/menu")
@RequiredArgsConstructor
public class MenuItemController {

    private final MenuItemService service;

    // Меню для будь-якого авторизованого користувача (гість / персонал)
    @GetMapping
    public List<MenuItem> getMenu() {
        return service.getAllAvailableMenu();
    }

    // TODO (крок 3): замінити на DTO і розширити до повного CRUD
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public MenuItem addMenuItem(@RequestBody MenuItem item) {
        return service.createMenuItem(item);
    }
}
