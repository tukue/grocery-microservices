package com.grocery.microservices.order.service;

import com.grocery.microservices.order.model.Order;
import com.grocery.microservices.order.model.OrderStatus;
import com.grocery.microservices.order.exception.InvalidOrderStateException;
import com.grocery.microservices.order.exception.OrderNotFoundException;
import com.grocery.microservices.order.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
class OrderServiceTest {
    private OrderRepository orderRepository;
    private OrderService orderService;
    private Order testOrder;

    @BeforeEach
    void setUp() {
        orderRepository = Mockito.mock(OrderRepository.class);
        orderService = new OrderService(orderRepository);
        testOrder = new Order();
        testOrder.setId(1L);
        testOrder.setTotal(100.0);
        testOrder.setStatus(OrderStatus.PENDING);
    }

    @Test
    void testCreateOrder() {
        // Arrange
        Order newOrder = new Order();
        newOrder.setTotal(50.0);
        when(orderRepository.save(Mockito.any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Order createdOrder = orderService.createOrder(newOrder);

        // Assert
        assertNotNull(createdOrder);
        assertEquals(OrderStatus.PENDING, createdOrder.getStatus());
        assertNotNull(createdOrder.getOrderDate());
        verify(orderRepository, times(1)).save(Mockito.any(Order.class));
    }

    @Test
    void testUpdateOrderStatus_Valid() {
        // Arrange
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(orderRepository.save(Mockito.any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Order updatedOrder = orderService.updateOrderStatus(1L, OrderStatus.COMPLETED);

        // Assert
        assertEquals(OrderStatus.COMPLETED, updatedOrder.getStatus());
    }

    @Test
    void testUpdateOrderStatus_InvalidFromCompleted() {
        // Arrange
        testOrder.setStatus(OrderStatus.COMPLETED);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        // Act & Assert
        assertThrows(InvalidOrderStateException.class, () ->
            orderService.updateOrderStatus(1L, OrderStatus.CANCELLED)
        );
    }

    @Test
    void testUpdateOrderStatus_InvalidPendingToPending() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        InvalidOrderStateException exception = assertThrows(InvalidOrderStateException.class, () ->
            orderService.updateOrderStatus(1L, OrderStatus.PENDING)
        );

        assertEquals("A PENDING order can only be COMPLETED or CANCELLED", exception.getMessage());
        verify(orderRepository, never()).save(Mockito.any(Order.class));
    }

    @Test
    void testGetOrderById() {
        // Arrange
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));

        // Act & Assert
        Order foundOrder = orderService.getOrder(1L);
        assertNotNull(foundOrder);
        assertEquals(1L, foundOrder.getId());

        // Test not found scenario
        when(orderRepository.findById(2L)).thenReturn(Optional.empty());
        assertThrows(OrderNotFoundException.class, () -> orderService.getOrder(2L));
    }
}
