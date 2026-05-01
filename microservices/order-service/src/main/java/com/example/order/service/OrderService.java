package com.example.order.service;

import com.example.order.model.Order;
import com.example.order.model.OrderStatus;
import com.example.order.exception.InvalidOrderStateException;
import com.example.order.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

@Service
public class OrderService {
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; }

    @Transactional
    public Order createOrder(Order order) {
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        return repo.save(order);
    }

    public Order getOrder(Long id) {
        return repo.findById(id).orElseThrow(() -> new NoSuchElementException("Order not found with id: " + id));
    }

    @Transactional
    public Order updateOrderStatus(Long id, OrderStatus newStatus) {
        Order order = getOrder(id);
        
        // Basic state machine validation
        if (order.getStatus() == OrderStatus.COMPLETED) {
            throw new InvalidOrderStateException("Cannot change status of a COMPLETED order");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new InvalidOrderStateException("Cannot change status of a CANCELLED order");
        }
        
        order.setStatus(newStatus);
        return repo.save(order);
    }
} 