package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.MenuItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    // Меню бачить лише "живі" страви з активних категорій.
    // Страви у стоп-листі (available=false) повертаються, але з прапорцем,
    // щоб клієнт міг показати "немає в наявності".
    // EntityGraph підтягує категорію одним запитом (без N+1).
    @EntityGraph(attributePaths = "category")
    List<MenuItem> findAllByActiveTrueAndCategoryActiveTrue();

    @EntityGraph(attributePaths = "category")
    List<MenuItem> findAllByActiveTrueAndCategoryActiveTrueAndCategoryId(Integer categoryId);

    @EntityGraph(attributePaths = "category")
    Optional<MenuItem> findByIdAndActiveTrue(Long id);

    @Modifying
    @Query("update MenuItem m set m.favoritesCount = coalesce(m.favoritesCount, 0) + 1 where m.id = :id and m.active = true")
    int incrementFavoritesCount(@Param("id") Long id);

    @Modifying
    @Query("update MenuItem m set m.favoritesCount = case when coalesce(m.favoritesCount, 0) > 0 then m.favoritesCount - 1 else 0 end where m.id = :id and m.active = true")
    int decrementFavoritesCount(@Param("id") Long id);
}
