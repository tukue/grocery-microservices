package com.example.order.controller;

import com.example.order.model.Order;
import com.example.order.service.OrderService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
public class OrderController {
    private final OrderService service;
    public OrderController(OrderService service) { this.service = service; }

    @PostMapping
    public Order createOrder(@RequestBody Order order) { return service.createOrder(order); }

    @GetMapping("/{id}")
    public Order getOrder(@PathVariable Long id) { return service.getOrder(id); }
} 