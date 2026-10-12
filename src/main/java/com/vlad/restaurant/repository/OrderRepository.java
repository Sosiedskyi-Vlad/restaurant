package com.vlad.restaurant.repository;

import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.entity.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID>, JpaSpecificationExecutor<Order> {

    // EntityGraph підтягує стіл, позиції та страви одним запитом (без N+1)
    @EntityGraph(attributePaths = {"table", "items", "items.menuItem"})
    Optional<Order> findWithDetailsById(UUID id);

    // Активні (неоплачені) замовлення столу - для гостя
    @EntityGraph(attributePaths = {"table", "items", "items.menuItem"})
    List<Order> findAllByTableIdAndStatusNotOrderByCreatedAtAsc(UUID tableId, OrderStatus status);

    // Усі активні замовлення - дошка кухні/офіціанта, найстаріші першими
    @EntityGraph(attributePaths = {"table", "items", "items.menuItem"})
    List<Order> findAllByStatusNotOrderByCreatedAtAsc(OrderStatus status);

    @EntityGraph(attributePaths = {"table", "items", "items.menuItem"})
    List<Order> findAllByStatusOrderByCreatedAtAsc(OrderStatus status);

    // Останні закриті замовлення (для швидкого recall в KDS та офіціантів)
    @EntityGraph(attributePaths = {"table", "items", "items.menuItem"})
    List<Order> findTop10ByStatusOrderByCreatedAtDesc(OrderStatus status);

    // Динамічний пошук та фільтрація історії замовлень з пагінацією та EntityGraph
    @Override
    @EntityGraph(attributePaths = {"table", "items", "items.menuItem"})
    Page<Order> findAll(@Nullable Specification<Order> spec, Pageable pageable);

    // Блокує рядок на час транзакції: двоє людей не змінять статус одночасно.
    // Без EntityGraph навмисне: PostgreSQL не дозволяє FOR UPDATE разом з outer join.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") UUID id);
}
