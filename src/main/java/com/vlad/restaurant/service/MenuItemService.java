package com.vlad.restaurant.service;

import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository repository;

    // Отримати всі активні страви, які є в наявності
    public List<MenuItem> getAllAvailableMenu() {
        return repository.findAllByAvailableTrueAndActiveTrue();
    }

    // Створити нову страву
    public MenuItem createMenuItem(MenuItem item) {
        return repository.save(item);
    }
}
