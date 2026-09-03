package com.grocery.microservices.order.service;

import com.grocery.microservices.order.model.Order;
import com.grocery.microservices.order.model.OrderLine;
import com.grocery.microservices.order.model.OrderStatus;
import com.grocery.microservices.order.client.CartClient;
import com.grocery.microservices.order.client.CartItemSnapshot;
import com.grocery.microservices.order.client.CartSnapshot;
import com.grocery.microservices.order.exception.EmptyCartException;
import com.grocery.microservices.order.exception.InvalidOrderStateException;
import com.grocery.microservices.order.exception.OrderNotFoundException;
import com.grocery.microservices.order.exception.OrderAccessDeniedException;
import com.grocery.microservices.order.repository.OrderRepository;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import com.grocery.microservices.order.messaging.OrderEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private final OrderRepository repo;
    private final CartClient cartClient;
    private final OrderEventPublisher orderEventPublisher;

    public OrderService(OrderRepository repo, CartClient cartClient, OrderEventPublisher orderEventPublisher) {
        this.repo = repo;
        this.cartClient = cartClient;
        this.orderEventPublisher = orderEventPublisher;
    }

    @Transactional
    public Order createOrder(Order order) {
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        Order savedOrder = repo.save(order);
        orderEventPublisher.publish(OrderCreatedEvent.create(UUID.randomUUID(), UUID.randomUUID(), Instant.now(),
                savedOrder.getId(), savedOrder.getUserId(), savedOrder.getCartId(), savedOrder.getTotal()));
        log.info("EVENT=ORDER_CREATED ORDER_ID={} USER_ID={} TOTAL={}",
            savedOrder.getId(), savedOrder.getUserId(), savedOrder.getTotal());
        return savedOrder;
    }

    @Transactional
    public Order checkout(Long cartId, String userId, String authorizationHeader) {
        CartSnapshot cart = cartClient.getCart(cartId, authorizationHeader);
        if (cart.items() == null || cart.items().isEmpty()) {
            throw new EmptyCartException(cartId);
        }

        List<OrderLine> orderLines = cart.items().stream()
                .map(this::toOrderLine)
                .toList();
        Order order = new Order();
        order.setCartId(cartId);
        order.setUserId(userId);
        order.setOrderLines(orderLines);
        order.setTotal(orderLines.stream().mapToDouble(OrderLine::getLineTotal).sum());
        return createOrder(order);
    }

    public Order getOrder(Long id, String userId) {
        Order order = repo.findById(id).orElseThrow(() -> new OrderNotFoundException(id));
        if (userId == null || !userId.equals(order.getUserId())) {
            throw new OrderAccessDeniedException(id);
        }
        return order;
    }

    public List<Order> getOrdersForUser(String userId) {
        return repo.findByUserIdOrderByOrderDateDesc(userId);
    }

    @Transactional
    public Order updateOrderStatus(Long id, OrderStatus newStatus, String userId) {
        Order order = getOrder(id, userId);
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

    private OrderLine toOrderLine(CartItemSnapshot item) {
        return new OrderLine(item.productId(), item.productName(), item.price(), item.quantity());
    }
}
