package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, UUID> {
    Optional<RestaurantTable> findByQrCodeHash(String qrCodeHash);

    boolean existsByNumber(Integer number);
}
