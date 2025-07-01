package com.example.order.service;

import com.example.order.model.Order;
import com.example.order.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
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
    }

    @Test
    void testCreateOrder() {
        // Arrange
        Order newOrder = new Order();
        newOrder.setTotal(50.0);
        when(orderRepository.save(Mockito.any(Order.class))).thenReturn(newOrder);
        // Act
        Order createdOrder = orderService.createOrder(newOrder);
        // Assert
        assertNotNull(createdOrder);
        assertEquals(50.0, createdOrder.getTotal());
        verify(orderRepository, times(1)).save(Mockito.any(Order.class));
    }

    @Test
    void testGetOrderById() {
        // Arrange
        when(orderRepository.findById(1L)).thenReturn(Optional.of(testOrder));
        when(orderRepository.findById(2L)).thenReturn(Optional.empty());
        // Act & Assert
        Order foundOrder = orderService.getOrder(1L);
        assertNotNull(foundOrder);
        assertEquals(1L, foundOrder.getId());
        // Test not found scenario
        assertThrows(Exception.class, () -> orderService.getOrder(2L));
    }
} 