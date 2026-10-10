package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    List<Category> findAllByActiveTrueOrderByIdAsc();

    Optional<Category> findByIdAndActiveTrue(Integer id);
}
