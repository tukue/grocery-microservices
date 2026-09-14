package com.grocery.microservices.order.service;

import com.grocery.microservices.order.model.Order;
import com.grocery.microservices.order.model.OrderLine;
import com.grocery.microservices.order.model.OrderStatus;
import com.grocery.microservices.order.config.AuthenticatedCustomer;
import com.grocery.microservices.order.client.CartClient;
import com.grocery.microservices.order.client.CartItemSnapshot;
import com.grocery.microservices.order.client.CartSnapshot;
import com.grocery.microservices.order.client.ProductClient;
import com.grocery.microservices.order.exception.EmptyCartException;
import com.grocery.microservices.order.exception.CheckoutCartAlreadyCheckedOutException;
import com.grocery.microservices.order.exception.InvalidOrderStateException;
import com.grocery.microservices.order.exception.OrderNotFoundException;
import com.grocery.microservices.order.repository.OrderRepository;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import com.grocery.microservices.order.eventstore.OrderEventStore;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.ArrayList;
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
    private final Counter reservationsReserved;
    private final Counter reservationsReleased;

    public OrderService(OrderRepository repo, CartClient cartClient, ProductClient productClient,
                        OrderEventStore orderEventStore, MeterRegistry meterRegistry) {
        this.repo = repo;
        this.cartClient = cartClient;
        this.productClient = productClient;
        this.orderEventStore = orderEventStore;
        this.reservationsReserved = Counter.builder("checkout.reservations.reserved").register(meterRegistry);
        this.reservationsReleased = Counter.builder("checkout.reservations.released").register(meterRegistry);
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
        if (!cart.isOpen()) {
            throw new CheckoutCartAlreadyCheckedOutException(cartId);
        }
        if (cart.items() == null || cart.items().isEmpty()) {
            throw new EmptyCartException(cartId);
        }

        // Reserve stock for every cart line. Reservations are idempotent by key
        // (checkout key + product id), and any failure releases the lines that
        // were already reserved so a retry does not leak stock.
        List<ReservationHandle> reservations = new ArrayList<>();
        try {
            for (CartItemSnapshot item : cart.items()) {
                String reservationKey = reservationKeyFor(resolvedKey, customer.customerId(), item.productId());
                productClient.reserve(item.productId(), item.quantity(), reservationKey, authorizationHeader);
                reservations.add(new ReservationHandle(reservationKey, item.productId()));
                reservationsReserved.increment();
                log.info("EVENT=ORDER_RESERVED PRODUCT_ID={} QUANTITY={} KEY={}",
                        item.productId(), item.quantity(), reservationKey);
            }
        } catch (RuntimeException ex) {
            releaseReservations(reservations, authorizationHeader);
            throw ex;
        }

        try {
            List<OrderLine> orderLines = cart.items().stream()
                    .map(this::toOrderLine)
                    .toList();
            Order order = new Order();
            order.setCartId(cartId);
            order.setUserId(customer.customerId());
            order.setIdempotencyKey(resolvedKey);
            order.setOrderLines(orderLines);
            order.setTotal(orderLines.stream().mapToDouble(OrderLine::getLineTotal).sum());
            // Atomically claim the cart BEFORE persisting the order. The cart
            // service guards this with an optimistic lock, so a concurrent
            // checkout that already claimed the cart fails here and never
            // writes a second order for the same cart.
            cartClient.markCheckedOut(cartId, authorizationHeader);
            try {
                return createOrder(order, correlationId);
            } catch (DataIntegrityViolationException ex) {
                // Two requests raced with the same idempotency key past the
                // replay check and the unique (user_id, idempotency_key) index
                // rejected our insert. The winning order already owns stock for
                // this key, so surface it as an idempotent replay instead of a 500.
                log.info("EVENT=CHECKOUT_IDEMPOTENT_RACE_USER_ID={} KEY={}",
                        customer.customerId(), resolvedKey);
                return repo.findFirstByUserIdAndIdempotencyKey(customer.customerId(), resolvedKey)
                        .orElseThrow(() -> ex);
            } catch (RuntimeException ex) {
                // Order/event write failed after the cart was claimed; reopen the
                // cart so the customer can retry checkout instead of being stranded.
                try {
                    cartClient.markOpen(cartId, authorizationHeader);
                } catch (RuntimeException revertEx) {
                    log.error("EVENT=CART_REVERT_FAILED CART_ID={} REASON={}", cartId,
                            revertEx.getClass().getSimpleName());
                }
                throw ex;
            }
        } catch (RuntimeException ex) {
            // The order/event write failed; compensate so stock is not leaked.
            releaseReservations(reservations, authorizationHeader);
            throw ex;
        }
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

    private void releaseReservations(List<ReservationHandle> reservations, String authorizationHeader) {
        for (ReservationHandle reservation : reservations) {
            try {
                productClient.release(reservation.reservationKey(), authorizationHeader);
                reservationsReleased.increment();
                log.info("EVENT=ORDER_RESERVATION_RELEASED PRODUCT_ID={} KEY={}",
                        reservation.productId(), reservation.reservationKey());
            } catch (RuntimeException ex) {
                log.error("EVENT=ORDER_RESERVATION_RELEASE_FAILED KEY={} REASON={}",
                        reservation.reservationKey(), ex.getClass().getSimpleName());
            }
        }
    }

    private String reservationKeyFor(String checkoutKey, String customerId, Long productId) {
        return "checkout:" + customerId + ":" + checkoutKey + ":" + productId;
    }

    private record ReservationHandle(String reservationKey, Long productId) {
    }
}
