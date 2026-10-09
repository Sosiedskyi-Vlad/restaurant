package com.vlad.restaurant.controller;

import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/menu")
@RequiredArgsConstructor
public class MenuItemController {

    private final MenuItemService service;

    // GET-запит для отримання меню. Адреса: http://localhost:8080/api/v1/menu
    @GetMapping
    public List<MenuItem> getMenu() {
        return service.getAllAvailableMenu();
    }

    // POST-запит для додавання нової страви
    @PostMapping
    public MenuItem addMenuItem(@RequestBody MenuItem item) {
        return service.createMenuItem(item);
    }
}