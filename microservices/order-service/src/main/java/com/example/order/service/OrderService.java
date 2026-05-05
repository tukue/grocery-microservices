package com.example.order.service;

import com.example.order.model.Order;
import com.example.order.model.OrderStatus;
import com.example.order.exception.InvalidOrderStateException;
import com.example.order.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; }

    @Transactional
    public Order createOrder(Order order) {
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        Order savedOrder = repo.save(order);
        log.info("EVENT=ORDER_CREATED ORDER_ID={} USER_ID={} TOTAL={}", 
            savedOrder.getId(), savedOrder.getUserId(), savedOrder.getTotalAmount());
        return savedOrder;
    }

    public Order getOrder(Long id) {
        return repo.findById(id).orElseThrow(() -> new NoSuchElementException("Order not found with id: " + id));
    }

    @Transactional
    public Order updateOrderStatus(Long id, OrderStatus newStatus) {
        Order order = getOrder(id);
        OrderStatus oldStatus = order.getStatus();
        
        // Basic state machine validation
        if (oldStatus == OrderStatus.COMPLETED) {
            throw new InvalidOrderStateException("Cannot change status of a COMPLETED order");
        }
        if (oldStatus == OrderStatus.CANCELLED) {
            throw new InvalidOrderStateException("Cannot change status of a CANCELLED order");
        }
        
        order.setStatus(newStatus);
        Order updatedOrder = repo.save(order);
        log.info("EVENT=ORDER_STATUS_UPDATED ORDER_ID={} OLD_STATUS={} NEW_STATUS={}", 
            updatedOrder.getId(), oldStatus, newStatus);
        return updatedOrder;
    }
} 