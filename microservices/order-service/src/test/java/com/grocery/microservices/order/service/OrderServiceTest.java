package com.grocery.microservices.order.service;

import com.grocery.microservices.order.model.Order;
import com.grocery.microservices.order.model.OrderStatus;
import com.grocery.microservices.order.config.AuthenticatedCustomer;
import com.grocery.microservices.order.client.CartClient;
import com.grocery.microservices.order.client.CartItemSnapshot;
import com.grocery.microservices.order.client.CartSnapshot;
import com.grocery.microservices.order.client.ProductClient;
import com.grocery.microservices.order.client.ProductSnapshot;
import com.grocery.microservices.order.exception.EmptyCartException;
import com.grocery.microservices.order.exception.CheckoutCartNotFoundException;
import com.grocery.microservices.order.exception.InsufficientProductStockException;
import com.grocery.microservices.order.exception.InvalidOrderStateException;
import com.grocery.microservices.order.exception.OrderNotFoundException;
import com.grocery.microservices.order.exception.ProductUnavailableException;
import com.grocery.microservices.order.repository.OrderRepository;
import com.grocery.microservices.order.event.OrderCreatedEvent;
import com.grocery.microservices.order.eventstore.OrderEventStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;
import java.util.List;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
class OrderServiceTest {
    private OrderRepository orderRepository;
    private CartClient cartClient;
    private ProductClient productClient;
    private OrderEventStore orderEventStore;
    private OrderService orderService;
    private Order testOrder;
    private AuthenticatedCustomer customer1;
    private AuthenticatedCustomer customer2;

    @BeforeEach
    void setUp() {
        orderRepository = Mockito.mock(OrderRepository.class);
        cartClient = Mockito.mock(CartClient.class);
        productClient = Mockito.mock(ProductClient.class);
        orderEventStore = Mockito.mock(OrderEventStore.class);
        orderService = new OrderService(orderRepository, cartClient, productClient, orderEventStore);
        customer1 = new AuthenticatedCustomer("customer-1");
        customer2 = new AuthenticatedCustomer("customer-2");
        testOrder = new Order();
        testOrder.setId(1L);
        testOrder.setUserId("customer-1");
        testOrder.setTotal(100.0);
        testOrder.setStatus(OrderStatus.PENDING);
    }

    @Test
    void testCreateOrder() {
        Order newOrder = new Order();
        newOrder.setTotal(50.0);
        when(orderRepository.save(Mockito.any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order createdOrder = orderService.createOrder(newOrder);

        assertNotNull(createdOrder);
        assertEquals(OrderStatus.PENDING, createdOrder.getStatus());
        assertNotNull(createdOrder.getOrderDate());
        assertNotNull(createdOrder.getIdempotencyKey());
        verify(orderRepository, times(1)).save(Mockito.any(Order.class));
        verify(orderEventStore).enqueue(Mockito.any(OrderCreatedEvent.class));
    }

    @Test
    void testUpdateOrderStatus_Valid() {
        when(orderRepository.findByIdAndUserId(1L, "customer-1")).thenReturn(Optional.of(testOrder));
        when(orderRepository.save(Mockito.any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order updatedOrder = orderService.updateOrderStatus(1L, OrderStatus.COMPLETED, customer1);

        assertEquals(OrderStatus.COMPLETED, updatedOrder.getStatus());
    }

    @Test
    void testUpdateOrderStatus_InvalidFromCompleted() {
        testOrder.setStatus(OrderStatus.COMPLETED);
        when(orderRepository.findByIdAndUserId(1L, "customer-1")).thenReturn(Optional.of(testOrder));

        assertThrows(InvalidOrderStateException.class, () ->
            orderService.updateOrderStatus(1L, OrderStatus.CANCELLED, customer1)
        );
    }

    @Test
    void checkoutCreatesOrderFromCartSnapshot() {
        CartSnapshot cart = new CartSnapshot(1L, List.of(
                new CartItemSnapshot(10L, 101L, "Apples", 2.50, 2),
                new CartItemSnapshot(11L, 102L, "Bread", 3.00, 1)));
        when(cartClient.getCart(1L, "Bearer token")).thenReturn(cart);
        when(productClient.getProduct(101L)).thenReturn(new ProductSnapshot(101L, "Apples", 2.50, true, 100, null));
        when(productClient.getProduct(102L)).thenReturn(new ProductSnapshot(102L, "Bread", 3.00, true, 100, null));
        when(orderRepository.save(Mockito.any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order createdOrder = orderService.checkout(1L, "idem-key-1", null, customer1, "Bearer token");

        assertEquals("customer-1", createdOrder.getUserId());
        assertEquals("idem-key-1", createdOrder.getIdempotencyKey());
        assertEquals(8.0, createdOrder.getTotal());
        assertEquals(2, createdOrder.getOrderLines().size());
        assertEquals(5.0, createdOrder.getOrderLines().getFirst().getLineTotal());
        assertEquals(OrderStatus.PENDING, createdOrder.getStatus());
        verify(orderRepository).save(createdOrder);
    }

    @Test
    void checkoutGeneratesIdempotencyKeyWhenNotSupplied() {
        CartSnapshot cart = new CartSnapshot(1L, List.of(
                new CartItemSnapshot(10L, 101L, "Apples", 2.50, 1)));
        when(cartClient.getCart(1L, "Bearer token")).thenReturn(cart);
        when(productClient.getProduct(101L)).thenReturn(new ProductSnapshot(101L, "Apples", 2.50, true, 100, null));
        when(orderRepository.save(Mockito.any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Order createdOrder = orderService.checkout(1L, null, null, customer1, "Bearer token");

        assertNotNull(createdOrder.getIdempotencyKey());
    }

    @Test
    void checkoutReturnsOriginalOrderForRepeatedIdempotencyKey() {
        testOrder.setIdempotencyKey("idem-key-1");
        when(orderRepository.findFirstByUserIdAndIdempotencyKey("customer-1", "idem-key-1"))
                .thenReturn(Optional.of(testOrder));

        Order replayedOrder = orderService.checkout(1L, "idem-key-1", null, customer1, "Bearer token");

        assertEquals(testOrder.getId(), replayedOrder.getId());
        verify(orderRepository, never()).save(Mockito.any(Order.class));
        verify(orderEventStore, never()).enqueue(Mockito.any(OrderCreatedEvent.class));
        verify(cartClient, never()).getCart(Mockito.anyLong(), Mockito.anyString());
    }

    @Test
    void checkoutRejectsEmptyCartWithoutPersistingOrder() {
        when(cartClient.getCart(1L, "Bearer token")).thenReturn(new CartSnapshot(1L, List.of()));

        assertThrows(EmptyCartException.class, () -> orderService.checkout(1L, "idem-key-1", null, customer1, "Bearer token"));

        verify(orderRepository, never()).save(Mockito.any(Order.class));
    }

    @Test
    void checkoutDoesNotPersistWhenProductIsUnavailable() {
        CartSnapshot cart = new CartSnapshot(1L, List.of(
                new CartItemSnapshot(10L, 101L, "Apples", 2.50, 1)));
        when(cartClient.getCart(1L, "Bearer token")).thenReturn(cart);
        when(productClient.getProduct(101L)).thenReturn(new ProductSnapshot(101L, "Apples", 2.50, false, 100, null));

        assertThrows(ProductUnavailableException.class,
                () -> orderService.checkout(1L, "idem-key-1", null, customer1, "Bearer token"));

        verify(orderRepository, never()).save(Mockito.any(Order.class));
    }

    @Test
    void checkoutDoesNotPersistWhenStockIsInsufficient() {
        CartSnapshot cart = new CartSnapshot(1L, List.of(
                new CartItemSnapshot(10L, 101L, "Apples", 2.50, 5)));
        when(cartClient.getCart(1L, "Bearer token")).thenReturn(cart);
        when(productClient.getProduct(101L)).thenReturn(new ProductSnapshot(101L, "Apples", 2.50, true, 2, null));

        assertThrows(InsufficientProductStockException.class,
                () -> orderService.checkout(1L, "idem-key-1", null, customer1, "Bearer token"));

        verify(orderRepository, never()).save(Mockito.any(Order.class));
    }

    @Test
    void checkoutDoesNotPersistWhenCartIsMissing() {
        when(cartClient.getCart(99L, "Bearer token")).thenThrow(new CheckoutCartNotFoundException(99L));

        assertThrows(CheckoutCartNotFoundException.class,
                () -> orderService.checkout(99L, "idem-key-1", null, customer1, "Bearer token"));

        verify(orderRepository, never()).save(Mockito.any(Order.class));
    }

    @Test
    void testUpdateOrderStatus_InvalidPendingToPending() {
        when(orderRepository.findByIdAndUserId(1L, "customer-1")).thenReturn(Optional.of(testOrder));

        InvalidOrderStateException exception = assertThrows(InvalidOrderStateException.class, () ->
            orderService.updateOrderStatus(1L, OrderStatus.PENDING, customer1)
        );

        assertEquals("A PENDING order can only be COMPLETED or CANCELLED", exception.getMessage());
        verify(orderRepository, never()).save(Mockito.any(Order.class));
    }

    @Test
    void testGetOrderById() {
        when(orderRepository.findByIdAndUserId(1L, "customer-1")).thenReturn(Optional.of(testOrder));

        Order foundOrder = orderService.getOrder(1L, customer1);
        assertNotNull(foundOrder);
        assertEquals(1L, foundOrder.getId());

        when(orderRepository.findByIdAndUserId(2L, "customer-1")).thenReturn(Optional.empty());
        assertThrows(OrderNotFoundException.class, () -> orderService.getOrder(2L, customer1));
    }

    @Test
    void getOwnedOrderIsNotFoundForAnotherCustomer() {
        when(orderRepository.findByIdAndUserId(1L, "customer-2")).thenReturn(Optional.empty());

        assertThrows(OrderNotFoundException.class, () -> orderService.getOrder(1L, customer2));
    }

    @Test
    void updateOrderStatusIsNotFoundForAnotherCustomer() {
        when(orderRepository.findByIdAndUserId(1L, "customer-2")).thenReturn(Optional.empty());

        assertThrows(OrderNotFoundException.class,
                () -> orderService.updateOrderStatus(1L, OrderStatus.COMPLETED, customer2));

        verify(orderRepository, never()).save(Mockito.any(Order.class));
    }
}