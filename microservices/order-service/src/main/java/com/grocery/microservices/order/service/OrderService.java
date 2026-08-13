package com.grocery.microservices.order.service;

import com.grocery.microservices.order.model.Order;
import com.grocery.microservices.order.model.OrderStatus;
import com.grocery.microservices.order.exception.InvalidOrderStateException;
import com.grocery.microservices.order.exception.OrderNotFoundException;
import com.grocery.microservices.order.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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
            savedOrder.getId(), savedOrder.getUserId(), savedOrder.getTotal());
        return savedOrder;
    }

    public Order getOrder(Long id) {
        return repo.findById(id).orElseThrow(() -> new OrderNotFoundException(id));
    }

    @Transactional
    public Order updateOrderStatus(Long id, OrderStatus newStatus) {
        Order order = getOrder(id);
        OrderStatus oldStatus = order.getStatus();

        if (oldStatus != OrderStatus.PENDING) {
            throw new InvalidOrderStateException("Cannot change status of a " + oldStatus + " order");
        }
        if (newStatus != OrderStatus.COMPLETED && newStatus != OrderStatus.CANCELLED) {
            throw new InvalidOrderStateException("A PENDING order can only be COMPLETED or CANCELLED");
        }

        order.setStatus(newStatus);
        Order updatedOrder = repo.save(order);
        log.info("EVENT=ORDER_STATUS_UPDATED ORDER_ID={} OLD_STATUS={} NEW_STATUS={}",
            updatedOrder.getId(), oldStatus, newStatus);
        return updatedOrder;
    }
}
