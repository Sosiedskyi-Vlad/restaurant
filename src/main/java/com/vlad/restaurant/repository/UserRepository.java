package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    // Цей метод Spring реалізує сам: він знайде користувача за колонкою email
    Optional<User> findByEmail(String email);
}