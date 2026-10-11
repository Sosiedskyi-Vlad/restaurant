package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.HallElement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HallElementRepository extends JpaRepository<HallElement, UUID> {
    List<HallElement> findByZone(String zone);
}
