package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    // Страви, які не видалені (active) і є в наявності (available)
    List<MenuItem> findAllByAvailableTrueAndActiveTrue();
}
