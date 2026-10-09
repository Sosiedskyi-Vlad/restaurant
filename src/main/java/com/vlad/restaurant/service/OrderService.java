package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.dto.OrderEventMessage;
import com.vlad.restaurant.dto.OrderResponse;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.entity.OrderItem;
import com.vlad.restaurant.entity.OrderStatus;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.exception.BadRequestException;
import com.vlad.restaurant.exception.ConflictException;
import com.vlad.restaurant.event.OrderEvent;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.OrderRepository;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import com.vlad.restaurant.security.GuestPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    // Допустимий наступний статус і ролі, які можуть виконати цей перехід.
    // Життєвий цикл лінійний: NEW -> PREPARING -> READY -> PAID
    private record Step(OrderStatus next, Set<String> roles) {}

    private static final Map<OrderStatus, Step> FLOW = Map.of(
            OrderStatus.NEW, new Step(OrderStatus.PREPARING, Set.of("ROLE_COOK", "ROLE_ADMIN")),
            OrderStatus.PREPARING, new Step(OrderStatus.READY, Set.of("ROLE_COOK", "ROLE_ADMIN")),
            OrderStatus.READY, new Step(OrderStatus.PAID, Set.of("ROLE_WAITER", "ROLE_ADMIN"))
    );

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final RestaurantTableRepository tableRepository;
    private final ApplicationEventPublisher eventPublisher;

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
            // Фіксуємо ціну на момент замовлення
            orderItem.setPriceAtTime(menuItem.getPrice());
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

    // Зміна статусу: перевіряємо і допустимість переходу, і права ролі.
    // Рядок блокується (PESSIMISTIC_WRITE), тож одночасні запити виконуються по черзі.
    @Transactional
    public OrderResponse updateStatus(UUID id, OrderStatus target, Authentication auth) {
        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Замовлення не знайдено"));

        OrderStatus current = order.getStatus();
        Step step = FLOW.get(current);

        if (step == null || step.next() != target) {
            String hint = step == null
                    ? "Замовлення вже у фінальному статусі"
                    : "Наступний допустимий статус: " + step.next();
            throw new ConflictException("Перехід " + current + " -> " + target + " неможливий. " + hint);
        }

        boolean allowed = auth.getAuthorities().stream()
                .anyMatch(a -> step.roles().contains(a.getAuthority()));
        if (!allowed) {
            throw new AccessDeniedException("Ваша роль не може виконати перехід " + current + " -> " + target);
        }

        order.setStatus(target);
        LocalDateTime now = LocalDateTime.now();
        switch (target) {
            case PREPARING -> order.setPreparingAt(now);
            case READY -> order.setReadyAt(now);
            case PAID -> markPaid(order, now); // закриття офіціантом = розрахунок (готівка/термінал)
            default -> { }
        }
        OrderResponse response = OrderResponse.from(order);
        UUID tId = order.getTable() != null ? order.getTable().getId() : null;
        eventPublisher.publishEvent(new OrderEvent(tId,
                new OrderEventMessage(OrderEventMessage.Type.ORDER_STATUS_CHANGED, current, response)));
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
}
