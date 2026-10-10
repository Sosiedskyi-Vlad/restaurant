package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.ServiceCall;
import com.vlad.restaurant.entity.ServiceCallStatus;
import com.vlad.restaurant.entity.ServiceCallType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceCallRepository extends JpaRepository<ServiceCall, UUID> {

    @EntityGraph(attributePaths = "table")
    List<ServiceCall> findAllByStatusOrderByCreatedAtAsc(ServiceCallStatus status);

    @EntityGraph(attributePaths = "table")
    List<ServiceCall> findAllByTableIdAndStatusOrderByCreatedAtAsc(UUID tableId, ServiceCallStatus status);

    @EntityGraph(attributePaths = "table")
    Optional<ServiceCall> findFirstByTableIdAndTypeAndStatus(UUID tableId, ServiceCallType type, ServiceCallStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ServiceCall c where c.id = :id")
    Optional<ServiceCall> findByIdForUpdate(@Param("id") UUID id);
}
