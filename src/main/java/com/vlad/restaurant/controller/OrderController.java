package com.vlad.restaurant.controller;

import com.vlad.restaurant.dto.OrderCreateRequest;
import com.vlad.restaurant.entity.Order;
import com.vlad.restaurant.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public Order createOrder(@RequestBody OrderCreateRequest request) {
        return orderService.createOrder(request);
    }
}