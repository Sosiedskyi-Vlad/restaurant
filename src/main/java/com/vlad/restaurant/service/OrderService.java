package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.entity.OrderItem;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;

    // @Transactional гарантує властивості ACID: якщо хоча б одна страва не знайдеться,
    // все замовлення скасується і нічого не запишеться в базу.
    @Transactional
    public Order createOrder(OrderCreateRequest request) {
        Order order = new Order();
        order.setTableNumber(request.tableNumber());
        // Статус "NEW" і час створення вже встановлені за замовчуванням в Entity

        // Проходимося по кожній страві, яку прислав клієнт
        for (OrderCreateRequest.OrderItemRequest itemRequest : request.items()) {

            // 1. Шукаємо страву в базі даних за ID
            MenuItem menuItem = menuItemRepository.findById(itemRequest.menuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Страву з ID " + itemRequest.menuItemId() + " не знайдено"));

            // 2. Створюємо позицію для чека
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order); // Вказуємо, якому замовленню належить позиція
            orderItem.setMenuItem(menuItem);
            orderItem.setQuantity(itemRequest.quantity());

            // 3. ФІКСУЄМО ЦІНУ! Це архітектурно правильне рішення.
            orderItem.setPriceAtTime(menuItem.getPrice());

            // 4. Додаємо позицію до замовлення
            order.getItems().add(orderItem);
        }

        // Зберігаємо замовлення. Завдяки cascade = CascadeType.ALL збережуться і всі OrderItem
        return orderRepository.save(order);
    }
}