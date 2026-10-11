package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.RestaurantInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RestaurantInfoRepository extends JpaRepository<RestaurantInfo, Long> {
}
