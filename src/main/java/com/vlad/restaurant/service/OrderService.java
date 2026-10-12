package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.dto.OrderEventMessage;
import com.vlad.restaurant.dto.OrderResponse;
import com.vlad.restaurant.dto.KdsMetricsResponse;
import com.vlad.restaurant.repository.AnalyticsRepository;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.entity.OrderItem;
import com.vlad.restaurant.entity.OrderStatus;
import com.vlad.restaurant.entity.OrderItemStatus;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.exception.BadRequestException;
import com.vlad.restaurant.exception.ConflictException;
import com.vlad.restaurant.event.OrderEvent;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.OrderRepository;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import com.vlad.restaurant.security.GuestPrincipal;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {

    // Допустимі переходи статусів (вперед та відкат назад Undo):
    // Вперед: NEW -> PREPARING -> READY -> PAID
    // Відкат (Undo): PREPARING -> NEW, READY -> PREPARING, PAID -> READY (Recall)
    private static final Map<OrderStatus, Map<OrderStatus, Set<String>>> ALLOWED_TRANSITIONS = Map.of(
            OrderStatus.NEW, Map.of(
                    OrderStatus.PREPARING, Set.of("ROLE_COOK", "ROLE_ADMIN")
            ),
            OrderStatus.PREPARING, Map.of(
                    OrderStatus.READY, Set.of("ROLE_COOK", "ROLE_ADMIN"),
                    OrderStatus.NEW, Set.of("ROLE_COOK", "ROLE_ADMIN") // Відкат у "Нові"
            ),
            OrderStatus.READY, Map.of(
                    OrderStatus.PAID, Set.of("ROLE_WAITER", "ROLE_ADMIN"),
                    OrderStatus.PREPARING, Set.of("ROLE_COOK", "ROLE_ADMIN") // Відкат у "Готується"
            ),
            OrderStatus.PAID, Map.of(
                    OrderStatus.READY, Set.of("ROLE_WAITER", "ROLE_ADMIN", "ROLE_COOK") // Відкат/Recall у "Очікують видачі"
            )
    );

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final RestaurantTableRepository tableRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AnalyticsRepository analyticsRepository;

    // @Transactional гарантує ACID: якщо хоча б одна страва не пройде перевірку,
    // нічого не запишеться в базу.
    @Transactional
    public OrderResponse createOrder(UUID tableId, OrderCreateRequest request) {
        // Стіл береться з JWT гостя, а не з тіла запиту - підмінити його неможливо
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Стіл не знайдено"));

        Order order = new Order();
        order.setTable(table);

        for (OrderCreateRequest.OrderItemRequest itemRequest : request.items()) {
            MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                    .filter(m -> m.isActive() && (m.getCategory() == null || m.getCategory().isActive()))
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Страву з ID " + itemRequest.menuItemId() + " не знайдено"));

            if (!menuItem.isAvailable()) {
                throw new BadRequestException("Страва \"" + menuItem.getName() + "\" зараз у стоп-листі");
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setMenuItem(menuItem);
            orderItem.setQuantity(itemRequest.quantity());
            // Фіксуємо ціну з урахуванням опцій
            java.math.BigDecimal finalPrice = menuItem.getPrice();
            String selectedOptionsStr = null;
            if (itemRequest.options() != null && !itemRequest.options().isEmpty()) {
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    selectedOptionsStr = mapper.writeValueAsString(itemRequest.options());
                    if (menuItem.getVariations() != null && !menuItem.getVariations().isBlank()) {
                        java.util.List<Map<String, Object>> variations = mapper.readValue(menuItem.getVariations(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
                        java.util.List<Map<String, Object>> selectedOpts = new java.util.ArrayList<>();
                        
                        for (Map.Entry<String, java.util.List<String>> entry : itemRequest.options().entrySet()) {
                            for (Map<String, Object> varGroup : variations) {
                                if (entry.getKey().equals(varGroup.get("name"))) {
                                    java.util.List<Map<String, Object>> options = (java.util.List<Map<String, Object>>) varGroup.get("options");
                                    for (Map<String, Object> opt : options) {
                                        if (entry.getValue().contains(opt.get("name"))) {
                                            selectedOpts.add(opt);
                                        }
                                    }
                                }
                            }
                        }
                        
                        // First apply absolute prices
                        for (Map<String, Object> opt : selectedOpts) {
                            Boolean isAbsolute = (Boolean) opt.get("isAbsolute");
                            if (Boolean.TRUE.equals(isAbsolute)) {
                                finalPrice = new java.math.BigDecimal(opt.get("price").toString());
                            }
                        }
                        
                        // Then apply additive prices
                        for (Map<String, Object> opt : selectedOpts) {
                            Boolean isAbsolute = (Boolean) opt.get("isAbsolute");
                            if (!Boolean.TRUE.equals(isAbsolute)) {
                                finalPrice = finalPrice.add(new java.math.BigDecimal(opt.get("price").toString()));
                            }
                        }
                    }
                } catch (Exception e) {
                    log.error("Помилка парсингу опцій", e);
                }
            }
            orderItem.setPriceAtTime(finalPrice);
            orderItem.setSelectedOptions(selectedOptionsStr);
            order.getItems().add(orderItem);
        }

        OrderResponse response = OrderResponse.from(orderRepository.save(order));
        // Подія піде в WebSocket лише після коміту цієї транзакції
        eventPublisher.publishEvent(new OrderEvent(tableId,
                new OrderEventMessage(OrderEventMessage.Type.ORDER_CREATED, null, response)));
        return response;
    }

    // Гість: усі неоплачені замовлення свого столу (їх може бути кілька)
    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(UUID tableId) {
        return orderRepository.findAllByTableIdAndStatusNotOrderByCreatedAtAsc(tableId, OrderStatus.PAID)
                .stream().map(OrderResponse::from).toList();
    }

    // Персонал: дошка активних замовлень. Необов'язковий фільтр за статусом.
    @Transactional(readOnly = true)
    public List<OrderResponse> getActiveOrders(OrderStatus status) {
        if (status == OrderStatus.PAID) {
            throw new BadRequestException("Оплачені замовлення не є активними");
        }
        List<Order> orders = status == null
                ? orderRepository.findAllByStatusNotOrderByCreatedAtAsc(OrderStatus.PAID)
                : orderRepository.findAllByStatusOrderByCreatedAtAsc(status);
        return orders.stream().map(OrderResponse::from).toList();
    }

    // Персонал бачить будь-яке замовлення, гість - лише замовлення свого столу.
    // Чуже замовлення для гостя "не існує" (404), щоб не розкривати факт його наявності.
    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID id, Authentication auth) {
        Order order = orderRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));

        if (auth.getPrincipal() instanceof GuestPrincipal guest
                && (order.getTable() == null || !order.getTable().getId().equals(guest.tableId()))) {
            throw new ResourceNotFoundException("Замовлення не знайдено");
        }
        return OrderResponse.from(order);
    }

    // Зміна статусу: перевіряємо і допустимість переходу (вперед або Undo), і права ролі.
    // Рядок блокується (PESSIMISTIC_WRITE), тож одночасні запити виконуються по черзі.
    @Transactional
    public OrderResponse updateStatus(UUID id, OrderStatus target, Authentication auth) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));

        OrderStatus current = order.getStatus();
        Map<OrderStatus, Set<String>> allowedMap = ALLOWED_TRANSITIONS.get(current);
        Set<String> roles = allowedMap != null ? allowedMap.get(target) : null;

        if (roles == null) {
            String hint = allowedMap == null
                    ? "Замовлення вже у фінальному статусі"
                    : "Допустимі переходи: " + allowedMap.keySet();
            throw new ConflictException("Перехід " + current + " -> " + target + " неможливий. " + hint);
        }

        boolean allowed = auth.getAuthorities().stream()
                .anyMatch(a -> roles.contains(a.getAuthority()));
        if (!allowed) {
            throw new AccessDeniedException("Ваша роль не може виконати перехід " + current + " -> " + target);
        }

        order.setStatus(target);
        LocalDateTime now = LocalDateTime.now();
        switch (target) {
            case NEW -> {
                // Відкат із PREPARING назад у NEW
                order.setPreparingAt(null);
                order.getItems().forEach(i -> {
                    if (i.getStatus() == OrderItemStatus.PREPARING || i.getStatus() == OrderItemStatus.READY) {
                        i.setStatus(OrderItemStatus.NEW);
                    }
                });
            }
            case PREPARING -> {
                if (current == OrderStatus.NEW) {
                    order.setPreparingAt(now);
                    order.getItems().forEach(i -> {
                        if (i.getStatus() == OrderItemStatus.NEW) {
                            i.setStatus(OrderItemStatus.PREPARING);
                        }
                    });
                } else if (current == OrderStatus.READY) {
                    // Відкат із READY назад у PREPARING
                    order.setReadyAt(null);
                    order.getItems().forEach(i -> {
                        if (i.getStatus() == OrderItemStatus.READY) {
                            i.setStatus(OrderItemStatus.PREPARING);
                        }
                    });
                }
            }
            case READY -> {
                order.setReadyAt(now);
                order.getItems().forEach(i -> i.setStatus(OrderItemStatus.READY));
            }
            case PAID -> {
                markPaid(order, now); // закриття офіціантом = розрахунок (готівка/термінал)
                order.getItems().forEach(i -> i.setStatus(OrderItemStatus.SERVED));
            }
            default -> { }
        }
        OrderResponse response = OrderResponse.from(order);
        UUID tId = order.getTable() != null ? order.getTable().getId() : null;
        eventPublisher.publishEvent(new OrderEvent(tId,
                new OrderEventMessage(OrderEventMessage.Type.ORDER_STATUS_CHANGED, current, response)));
        return response;
    }

    // Повернення випадково закритого або оплаченого замовлення назад у роботу (Recall)
    @Transactional
    public OrderResponse recallOrder(UUID id, Authentication auth) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));

        OrderStatus current = order.getStatus();
        if (current != OrderStatus.PAID) {
            throw new BadRequestException("Повернути в роботу можна лише закриті/оплачені замовлення");
        }

        order.setStatus(OrderStatus.READY);
        order.setReadyAt(LocalDateTime.now());
        // Скидаємо статус страв із SERVED назад у READY
        order.getItems().forEach(i -> {
            if (i.getStatus() == OrderItemStatus.SERVED) {
                i.setStatus(OrderItemStatus.READY);
            }
        });

        Order saved = orderRepository.save(order);
        OrderResponse response = OrderResponse.from(saved);
        UUID tId = order.getTable() != null ? order.getTable().getId() : null;

        eventPublisher.publishEvent(new OrderEvent(tId,
                new OrderEventMessage(OrderEventMessage.Type.ORDER_STATUS_CHANGED, current, response)));
        log.info("Замовлення {} успішно відкликано (Recall) назад у статус READY користувачем {}", id, auth.getName());
        return response;
    }

    // Останні завершені замовлення (для швидкого recall в KDS)
    @Transactional(readOnly = true)
    public List<OrderResponse> getRecentlyClosedOrders() {
        return orderRepository.findTop10ByStatusOrderByCreatedAtDesc(OrderStatus.PAID)
                .stream().map(OrderResponse::from).toList();
    }

    // Історія замовлень із гнучкими фільтрами, Specification та пагінацією
    @Transactional(readOnly = true)
    public Page<OrderResponse> getOrderHistory(
            OrderStatus status,
            Integer tableNumber,
            LocalDateTime from,
            LocalDateTime to,
            String search,
            Pageable pageable
    ) {
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (tableNumber != null) {
                predicates.add(cb.equal(root.get("table").get("number"), tableNumber));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), to));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";

                // Перевірка назви страви через EXISTS підзапит (не ламає пагінацію і distinct)
                Subquery<Integer> itemSubquery = query.subquery(Integer.class);
                Root<OrderItem> itemRoot = itemSubquery.from(OrderItem.class);
                itemSubquery.select(cb.literal(1))
                        .where(
                                cb.equal(itemRoot.get("order"), root),
                                cb.like(cb.lower(itemRoot.get("menuItem").get("name")), pattern)
                        );

                // Перевірка номеру столу як рядка
                Expression<String> tableNumStr = root.get("table").get("number").as(String.class);
                Predicate tableMatch = cb.like(tableNumStr, pattern);

                predicates.add(cb.or(tableMatch, cb.exists(itemSubquery)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return orderRepository.findAll(spec, pageable).map(OrderResponse::from);
    }

    // Оновлення статусу окремої страви в замовленні (поштучний KDS чекліст)
    @Transactional
    public OrderResponse updateItemStatus(UUID orderId, UUID itemId, OrderItemStatus target, Authentication auth) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));

        OrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Позицію замовлення не знайдено"));

        item.setStatus(target);

        // Якщо замовлення було в NEW і почали готувати або віддали страву:
        if (order.getStatus() == OrderStatus.NEW && (target == OrderItemStatus.PREPARING || target == OrderItemStatus.READY)) {
            order.setStatus(OrderStatus.PREPARING);
            order.setPreparingAt(LocalDateTime.now());
        }

        // Перевіряємо, чи всі страви стали READY або SERVED:
        boolean allReady = order.getItems().stream()
                .allMatch(i -> i.getStatus() == OrderItemStatus.READY || i.getStatus() == OrderItemStatus.SERVED);
        if (allReady && order.getStatus() == OrderStatus.PREPARING) {
            order.setStatus(OrderStatus.READY);
            order.setReadyAt(LocalDateTime.now());
        } else if (!allReady && order.getStatus() == OrderStatus.READY && target != OrderItemStatus.SERVED) {
            // Якщо випадково зняли статус готовності зі страви
            order.setStatus(OrderStatus.PREPARING);
        }

        Order saved = orderRepository.save(order);
        OrderResponse response = OrderResponse.from(saved);
        UUID tId = order.getTable() != null ? order.getTable().getId() : null;
        eventPublisher.publishEvent(new OrderEvent(tId,
                new OrderEventMessage(OrderEventMessage.Type.ORDER_STATUS_CHANGED, order.getStatus(), response)));
        return response;
    }

    // Викликається після підтвердженої онлайн-оплати (див. PaymentService).
    // Ідемпотентний: повторний callback від платіжного провайдера нічого не змінює.
    @Transactional
    public OrderResponse markPaidOnline(UUID orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));
        if (order.isPaid()) {
            return OrderResponse.from(order);
        }
        OrderStatus previous = order.getStatus();
        markPaid(order, LocalDateTime.now());
        // Якщо страву вже видали (READY), оплата закриває замовлення.
        // Інакше воно продовжує звичайний шлях через кухню, але вже з позначкою "оплачено".
        if (previous == OrderStatus.READY) {
            order.setStatus(OrderStatus.PAID);
        }
        OrderResponse response = OrderResponse.from(order);
        UUID tId = order.getTable() != null ? order.getTable().getId() : null;
        eventPublisher.publishEvent(new OrderEvent(tId,
                new OrderEventMessage(OrderEventMessage.Type.ORDER_PAID, previous, response)));
        return response;
    }

    private void markPaid(Order order, LocalDateTime now) {
        if (!order.isPaid()) {
            order.setPaid(true);
            order.setPaidAt(now);
        }
    }

    // Міні-показники зміни для KDS (середній час, видані страви, затримки)
    @Transactional(readOnly = true)
    public KdsMetricsResponse getKdsMetrics() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);

        List<Order> active = orderRepository.findAllByStatusNotOrderByCreatedAtAsc(OrderStatus.PAID);
        long activeCount = active.size();
        long preparingCount = active.stream().filter(o -> o.getStatus() == OrderStatus.PREPARING).count();
        long readyCount = active.stream().filter(o -> o.getStatus() == OrderStatus.READY).count();
        long delayedCount = active.stream().filter(o -> o.getCreatedAt().isBefore(now.minusMinutes(20))).count();

        long completedToday = analyticsRepository.paidOrders(todayStart, todayEnd);
        Double avgSec = analyticsRepository.avgCookingSeconds(todayStart, todayEnd);
        Double avgMinutes = avgSec != null ? Math.round(avgSec / 60.0 * 10.0) / 10.0 : null;
        long totalDishes = analyticsRepository.totalDishesCooked(todayStart, todayEnd);

        return new KdsMetricsResponse(
                activeCount,
                preparingCount,
                readyCount,
                completedToday,
                delayedCount,
                avgMinutes,
                totalDishes
        );
    }
}
