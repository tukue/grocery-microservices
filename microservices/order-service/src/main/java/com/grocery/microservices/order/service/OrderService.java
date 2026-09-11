package com.grocery.microservices.order.service;

import com.grocery.microservices.order.model.Order;
import com.grocery.microservices.order.model.OrderLine;
import com.grocery.microservices.order.model.OrderStatus;
import com.grocery.microservices.order.config.AuthenticatedCustomer;
import com.grocery.microservices.order.client.CartClient;
import com.grocery.microservices.order.client.CartItemSnapshot;
import com.grocery.microservices.order.client.CartSnapshot;
import com.grocery.microservices.order.client.ProductClient;
import com.grocery.microservices.order.client.ProductSnapshot;
import com.grocery.microservices.order.exception.EmptyCartException;
import com.grocery.microservices.order.exception.InsufficientProductStockException;
import com.grocery.microservices.order.exception.InvalidOrderStateException;
import com.grocery.microservices.order.exception.OrderNotFoundException;
import com.grocery.microservices.order.exception.ProductUnavailableException;
import com.grocery.microservices.order.repository.OrderRepository;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import com.grocery.microservices.order.eventstore.OrderEventStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private final OrderRepository repo;
    private final CartClient cartClient;
    private final ProductClient productClient;
    private final OrderEventStore orderEventStore;

    public OrderService(OrderRepository repo, CartClient cartClient, ProductClient productClient,
                        OrderEventStore orderEventStore) {
        this.repo = repo;
        this.cartClient = cartClient;
        this.productClient = productClient;
        this.orderEventStore = orderEventStore;
    }

    @Transactional
    public Order createOrder(Order order) {
        return createOrder(order, null);
    }

    @Transactional
    public Order createOrder(Order order, String correlationId) {
        if (order.getIdempotencyKey() == null || order.getIdempotencyKey().isBlank()) {
            order.setIdempotencyKey(UUID.randomUUID().toString());
        }
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());
        Order savedOrder = repo.save(order);
        UUID eventId = UUID.randomUUID();
        String resolvedCorrelationId = correlationId == null || correlationId.isBlank()
                ? eventId.toString()
                : correlationId;
        orderEventStore.enqueue(new OrderCreatedEvent(eventId, Instant.now(),
                savedOrder.getId(), savedOrder.getUserId(), savedOrder.getCartId(), savedOrder.getTotal(),
                resolvedCorrelationId));
        log.info("EVENT=ORDER_CREATED ORDER_ID={} USER_ID={} TOTAL={} CORRELATION_ID={}",
            savedOrder.getId(), savedOrder.getUserId(), savedOrder.getTotal(), resolvedCorrelationId);
        return savedOrder;
    }

    @Transactional
    public Order checkout(Long cartId, String idempotencyKey, String correlationId,
                          AuthenticatedCustomer customer, String authorizationHeader) {
        String resolvedKey = resolveIdempotencyKey(idempotencyKey);
        Optional<Order> existing = repo.findFirstByUserIdAndIdempotencyKey(customer.customerId(), resolvedKey);
        if (existing.isPresent()) {
            log.info("EVENT=CHECKOUT_IDEMPOTENT_REPLAY ORDER_ID={} USER_ID={} KEY={}",
                    existing.get().getId(), customer.customerId(), resolvedKey);
            return existing.get();
        }

        CartSnapshot cart = cartClient.getCart(cartId, authorizationHeader);
        if (cart.items() == null || cart.items().isEmpty()) {
            throw new EmptyCartException(cartId);
        }

        validateStockAvailability(cart.items());

        List<OrderLine> orderLines = cart.items().stream()
                .map(this::toOrderLine)
                .toList();
        Order order = new Order();
        order.setCartId(cartId);
        order.setUserId(customer.customerId());
        order.setIdempotencyKey(resolvedKey);
        order.setOrderLines(orderLines);
        order.setTotal(orderLines.stream().mapToDouble(OrderLine::getLineTotal).sum());
        return createOrder(order, correlationId);
    }

    public Order getOrder(Long id, AuthenticatedCustomer customer) {
        return repo.findByIdAndUserId(id, customer.customerId())
                .orElseThrow(() -> new OrderNotFoundException(id));
    }

    public List<Order> getOrdersForUser(AuthenticatedCustomer customer) {
        return repo.findByUserIdOrderByOrderDateDesc(customer.customerId());
    }

    @Transactional
    public Order updateOrderStatus(Long id, OrderStatus newStatus, AuthenticatedCustomer customer) {
        Order order = getOrder(id, customer);
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

    private String resolveIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return UUID.randomUUID().toString();
        }
        String trimmed = idempotencyKey.trim();
        if (trimmed.length() > 64) {
            throw new IllegalArgumentException("Idempotency key must not exceed 64 characters");
        }
        return trimmed;
    }

    private void validateStockAvailability(List<CartItemSnapshot> items) {
        for (CartItemSnapshot item : items) {
            ProductSnapshot product = productClient.getProduct(item.productId());
            if (!product.available()) {
                throw new ProductUnavailableException(item.productId());
            }
            if (product.stockQuantity() < item.quantity()) {
                throw new InsufficientProductStockException(item.productId(), item.quantity(),
                        product.stockQuantity());
            }
        }
    }
}