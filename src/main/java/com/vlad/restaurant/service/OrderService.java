package com.vlad.restaurant.service;

import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.dto.OrderResponse;
import com.vlad.restaurant.entity.MenuItem;
import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.entity.OrderItem;
import com.vlad.restaurant.entity.RestaurantTable;
import com.vlad.restaurant.exception.BadRequestException;
import com.vlad.restaurant.exception.ResourceNotFoundException;
import com.vlad.restaurant.repository.MenuItemRepository;
import com.vlad.restaurant.repository.OrderRepository;
import com.vlad.restaurant.repository.RestaurantTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final RestaurantTableRepository tableRepository;

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
                    .filter(MenuItem::isActive)
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

        return OrderResponse.from(orderRepository.save(order));
    }
}
