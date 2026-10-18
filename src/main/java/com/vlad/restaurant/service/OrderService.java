package com.vlad.restaurant.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vlad.restaurant.dto.KdsMetricsResponse;
import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.dto.OrderEventMessage;
import com.vlad.restaurant.dto.OrderResponse;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.entity.OrderItem;
import com.vlad.restaurant.entity.OrderItemStatus;
import com.vlad.restaurant.entity.OrderStatus;
import com.vlad.restaurant.entity.Promotion;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.event.OrderEvent;
import com.vlad.restaurant.exception.BadRequestException;
import com.vlad.restaurant.exception.ConflictException;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.AnalyticsRepository;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.OrderRepository;
import com.vlad.restaurant.repository.PromotionRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
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
    private final PromotionRepository promotionRepository;
    private final ObjectMapper objectMapper;

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

            BigDecimal finalPrice = menuItem.getPrice();
            String selectedOptionsStr = null;
            if (itemRequest.options() != null && !itemRequest.options().isEmpty()) {
                finalPrice = resolvePriceWithOptions(menuItem, itemRequest.options());
                try {
                    selectedOptionsStr = objectMapper.writeValueAsString(itemRequest.options());
                } catch (Exception e) {
                    throw new BadRequestException("Некоректний формат модифікаторів страви \"" + menuItem.getName() + "\"");
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

    private BigDecimal resolvePriceWithOptions(MenuItem menuItem, Map<String, List<String>> requestedOptions) {
        BigDecimal finalPrice = menuItem.getPrice();
        if (menuItem.getVariations() == null || menuItem.getVariations().isBlank()) {
            return finalPrice;
        }
        try {
            List<Map<String, Object>> variations = objectMapper.readValue(
                    menuItem.getVariations(), new TypeReference<>() {});
            List<Map<String, Object>> selectedOpts = new ArrayList<>();

            for (Map.Entry<String, List<String>> entry : requestedOptions.entrySet()) {
                if (entry.getValue() == null || entry.getValue().isEmpty()) continue;
                for (Map<String, Object> varGroup : variations) {
                    if (entry.getKey().equals(varGroup.get("name"))) {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> options = (List<Map<String, Object>>) varGroup.get("options");
                        if (options != null) {
                            for (Map<String, Object> opt : options) {
                                if (entry.getValue().contains(String.valueOf(opt.get("name")))) {
                                    selectedOpts.add(opt);
                                }
                            }
                        }
                    }
                }
            }

            // Спочатку застосовуємо базові (абсолютні) ціни варіацій
            for (Map<String, Object> opt : selectedOpts) {
                Boolean isAbsolute = (Boolean) opt.get("isAbsolute");
                if (Boolean.TRUE.equals(isAbsolute) && opt.get("price") != null) {
                    finalPrice = new BigDecimal(opt.get("price").toString());
                }
            }

            // Потім додаємо надбавки за додаткові опції/топінги
            for (Map<String, Object> opt : selectedOpts) {
                Boolean isAbsolute = (Boolean) opt.get("isAbsolute");
                if (!Boolean.TRUE.equals(isAbsolute) && opt.get("price") != null) {
                    finalPrice = finalPrice.add(new BigDecimal(opt.get("price").toString()));
                }
            }
            return finalPrice.setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            log.error("Помилка розрахунку вартості опцій для страви {}", menuItem.getName(), e);
            throw new BadRequestException("Некоректні параметри модифікаторів для страви \"" + menuItem.getName() + "\"");
        }
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

    // Оновлення статусу окремої страви в замовленні (поштучний KDS чек-лист)
    @Transactional
    public OrderResponse updateItemStatus(UUID orderId, UUID itemId, OrderItemStatus target, Authentication auth) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));

        OrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Позицію замовлення не знайдено"));

        OrderStatus previousStatus = order.getStatus();
        item.setStatus(target);

        // Автоматична синхронізація інтегрального статусу чека
        syncOrderStatus(order, target);

        Order saved = orderRepository.save(order);
        OrderResponse response = OrderResponse.from(saved);
        UUID tId = order.getTable() != null ? order.getTable().getId() : null;
        eventPublisher.publishEvent(new OrderEvent(tId,
                new OrderEventMessage(OrderEventMessage.Type.ORDER_STATUS_CHANGED, previousStatus, response)));
        return response;
    }

    private void syncOrderStatus(Order order, OrderItemStatus target) {
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

    @Transactional
    public OrderResponse applyPromotion(UUID orderId, UUID promotionId) {
        return applyPromotion(orderId, promotionId, null);
    }

    @Transactional
    public OrderResponse applyPromotion(UUID orderId, UUID promotionId, Authentication auth) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));

        if (auth != null && auth.getPrincipal() instanceof GuestPrincipal guest) {
            if (order.getTable() == null || !order.getTable().getId().equals(guest.tableId())) {
                throw new AccessDeniedException("Ви не можете редагувати чуже замовлення");
            }
        }

        if (order.isPaid() || order.getStatus() == OrderStatus.PAID) {
            throw new ConflictException("Неможливо змінити знижку для вже оплаченого замовлення");
        }

        // Якщо раніше була застосована інша акція, зменшуємо її лічильники
        if (order.getAppliedPromotion() != null) {
            Promotion prevPromo = order.getAppliedPromotion();
            prevPromo.setUsageCount(Math.max(0, prevPromo.getUsageCount() - 1));
            BigDecimal prevDiscount = order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO;
            BigDecimal newTotal = prevPromo.getTotalDiscountGiven().subtract(prevDiscount);
            prevPromo.setTotalDiscountGiven(newTotal.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newTotal);
            promotionRepository.save(prevPromo);
        }

        if (promotionId == null) {
            // Скасування знижки
            order.setDiscountAmount(BigDecimal.ZERO);
            order.setAppliedPromotion(null);
            order.setAppliedPromotionTitle(null);
        } else {
            Promotion promo = promotionRepository.findById(promotionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Акцію не знайдено"));

            if (!promo.isActive()) {
                throw new BadRequestException("Ця акція наразі не активна");
            }

            BigDecimal discount;
            String promoTitle = promo.getTitle();

            if ("COMBO".equalsIgnoreCase(promo.getPromoType())) {
                discount = calculateComboDiscount(order, promo);
            } else {
                int percent = promo.getDiscountPercent() != null ? promo.getDiscountPercent() : 0;
                if (percent <= 0) {
                    throw new BadRequestException("Ця акція не передбачає відсоткової знижки на чек");
                }

                // Розрахунок вартості страв
                BigDecimal subtotal = order.getItems().stream()
                        .map(i -> i.getPriceAtTime().multiply(BigDecimal.valueOf(i.getQuantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                discount = subtotal.multiply(BigDecimal.valueOf(percent))
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                promoTitle = promo.getTitle() + " (-" + percent + "%)";
            }

            order.setDiscountAmount(discount);
            order.setAppliedPromotion(promo);
            order.setAppliedPromotionTitle(promoTitle);

            // Оновлюємо статистику акції
            promo.setUsageCount(promo.getUsageCount() + 1);
            promo.setTotalDiscountGiven(
                    (promo.getTotalDiscountGiven() != null ? promo.getTotalDiscountGiven() : BigDecimal.ZERO).add(discount)
            );
            promotionRepository.save(promo);
        }

        Order saved = orderRepository.save(order);
        OrderResponse response = OrderResponse.from(saved);
        UUID tId = saved.getTable() != null ? saved.getTable().getId() : null;
        eventPublisher.publishEvent(new OrderEvent(tId,
                new OrderEventMessage(OrderEventMessage.Type.ORDER_PROMOTION_UPDATED, saved.getStatus(), response)));
        return response;
    }

    private BigDecimal calculateComboDiscount(Order order, Promotion promo) {
        if (promo.getComboConfig() == null || promo.getComboConfig().isBlank()) {
            throw new BadRequestException("Конфігурація комбо-акції порожня");
        }

        try {
            JsonNode config = objectMapper.readTree(promo.getComboConfig());
            JsonNode slotsNode = config.get("slots");
            JsonNode rewardNode = config.get("reward");

            if (slotsNode == null || !slotsNode.isArray() || slotsNode.isEmpty()) {
                throw new BadRequestException("В акції не налаштовано вимоги до замовлення");
            }

            // Поштучний пул замовлених позицій
            class OrderUnit {
                final Long menuItemId;
                final Integer categoryId;
                final String name;
                final BigDecimal price;
                boolean used = false;
                OrderUnit(Long menuItemId, Integer categoryId, String name, BigDecimal price) {
                    this.menuItemId = menuItemId;
                    this.categoryId = categoryId;
                    this.name = name;
                    this.price = price;
                }
            }

            List<OrderUnit> pool = new ArrayList<>();
            for (OrderItem item : order.getItems()) {
                if (item.getMenuItem() == null) continue;
                Integer catId = item.getMenuItem().getCategory() != null ? item.getMenuItem().getCategory().getId() : null;
                int qty = item.getQuantity() != null ? item.getQuantity() : 1;
                BigDecimal unitPrice = item.getPriceAtTime() != null ? item.getPriceAtTime() : BigDecimal.ZERO;
                for (int i = 0; i < qty; i++) {
                    pool.add(new OrderUnit(
                            item.getMenuItem().getId(),
                            catId,
                            item.getMenuItem().getName(),
                            unitPrice
                    ));
                }
            }

            // 1. Перевірка вимог замовлення (Блок А)
            for (JsonNode slot : slotsNode) {
                int qtyNeeded = slot.has("quantity") ? slot.get("quantity").asInt(1) : 1;
                String selectionType = slot.has("selectionType") ? slot.get("selectionType").asText("CATEGORY") : "CATEGORY";
                Integer categoryId = slot.has("categoryId") && !slot.get("categoryId").isNull() ? slot.get("categoryId").asInt() : null;

                Set<Long> itemIds = new HashSet<>();
                if (slot.has("itemIds") && slot.get("itemIds").isArray()) {
                    for (JsonNode idNode : slot.get("itemIds")) {
                        itemIds.add(idNode.asLong());
                    }
                }

                int matched = 0;
                for (OrderUnit unit : pool) {
                    if (unit.used) continue;
                    boolean match;
                    if ("CATEGORY".equalsIgnoreCase(selectionType)) {
                        match = categoryId != null && categoryId.equals(unit.categoryId);
                    } else {
                        match = itemIds.contains(unit.menuItemId);
                    }
                    if (match) {
                        unit.used = true;
                        matched++;
                        if (matched == qtyNeeded) break;
                    }
                }

                if (matched < qtyNeeded) {
                    String slotDesc = slot.has("name") && !slot.get("name").asText().isBlank()
                            ? slot.get("name").asText()
                            : ("CATEGORY".equalsIgnoreCase(selectionType)
                                    ? (slot.has("categoryName") ? slot.get("categoryName").asText() : "страву з категорії")
                                    : "акційну страву");
                    throw new BadRequestException("Для комбо у замовленні не вистачає: " + slotDesc + " (ще " + (qtyNeeded - matched) + " шт.)");
                }
            }

            // 2. Винагорода (Блок Б)
            if (rewardNode == null || rewardNode.isNull()) {
                int percent = promo.getDiscountPercent() != null ? promo.getDiscountPercent() : 0;
                BigDecimal comboSubtotal = pool.stream().filter(u -> u.used).map(u -> u.price).reduce(BigDecimal.ZERO, BigDecimal::add);
                return comboSubtotal.multiply(BigDecimal.valueOf(percent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            }

            String rewardType = rewardNode.has("rewardType") ? rewardNode.get("rewardType").asText("FREE_ITEM") : "FREE_ITEM";

            if ("FREE_ITEM".equalsIgnoreCase(rewardType)) {
                int rewardQty = rewardNode.has("quantity") ? rewardNode.get("quantity").asInt(1) : 1;
                String rSelectionType = rewardNode.has("selectionType") ? rewardNode.get("selectionType").asText("CATEGORY") : "CATEGORY";
                Integer rCategoryId = rewardNode.has("categoryId") && !rewardNode.get("categoryId").isNull() ? rewardNode.get("categoryId").asInt() : null;
                Set<Long> rItemIds = new HashSet<>();
                if (rewardNode.has("itemIds") && rewardNode.get("itemIds").isArray()) {
                    for (JsonNode idNode : rewardNode.get("itemIds")) {
                        rItemIds.add(idNode.asLong());
                    }
                }

                List<OrderUnit> rewardMatches = new ArrayList<>();
                for (OrderUnit unit : pool) {
                    if (unit.used) continue;
                    boolean match;
                    if ("CATEGORY".equalsIgnoreCase(rSelectionType)) {
                        match = rCategoryId != null && rCategoryId.equals(unit.categoryId);
                    } else {
                        match = rItemIds.contains(unit.menuItemId);
                    }
                    if (match) {
                        rewardMatches.add(unit);
                    }
                }

                if (rewardMatches.size() < rewardQty) {
                    String rDesc = rewardNode.has("name") && !rewardNode.get("name").asText().isBlank()
                            ? rewardNode.get("name").asText()
                            : (rewardNode.has("categoryName") ? rewardNode.get("categoryName").asText() : "подарункову страву");
                    throw new BadRequestException("У замовленні відсутня акційна позиція-подарунок (" + rDesc + "). Будь ласка, додайте її до замовлення!");
                }

                rewardMatches.sort(Comparator.comparing(u -> u.price));
                BigDecimal discount = BigDecimal.ZERO;
                for (int i = 0; i < rewardQty && i < rewardMatches.size(); i++) {
                    OrderUnit r = rewardMatches.get(i);
                    r.used = true;
                    discount = discount.add(r.price);
                }
                return discount;
            } else if ("FIXED_PRICE".equalsIgnoreCase(rewardType)) {
                BigDecimal fixedPrice = rewardNode.has("fixedPrice") ? new BigDecimal(rewardNode.get("fixedPrice").asText("0")) : BigDecimal.ZERO;
                BigDecimal comboSubtotal = pool.stream().filter(u -> u.used).map(u -> u.price).reduce(BigDecimal.ZERO, BigDecimal::add);
                if (comboSubtotal.compareTo(fixedPrice) > 0) {
                    return comboSubtotal.subtract(fixedPrice);
                }
                return BigDecimal.ZERO;
            } else if ("DISCOUNT_PERCENT".equalsIgnoreCase(rewardType)) {
                int percent = rewardNode.has("discountPercent") ? rewardNode.get("discountPercent").asInt(0) : (promo.getDiscountPercent() != null ? promo.getDiscountPercent() : 0);
                BigDecimal comboSubtotal = pool.stream().filter(u -> u.used).map(u -> u.price).reduce(BigDecimal.ZERO, BigDecimal::add);
                return comboSubtotal.multiply(BigDecimal.valueOf(percent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            }

            return BigDecimal.ZERO;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Помилка розрахунку комбо-акції", e);
            throw new BadRequestException("Не вдалося розрахувати комбо-акцію: " + e.getMessage());
        }
    }
}
