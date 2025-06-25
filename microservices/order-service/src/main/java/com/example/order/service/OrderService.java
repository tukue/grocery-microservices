package com.example.order.service;

import com.example.order.model.Order;
import com.example.order.repository.OrderRepository;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; }

    public Order createOrder(Order order) { return repo.save(order); }
    public Order getOrder(Long id) { return repo.findById(id).orElseThrow(); }
} 