package com.example.order.service;

import com.example.order.model.Order;
import com.example.order.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.junit.jupiter.api.Assertions.*;

class OrderServiceTest {
    @Test
    void testCreateOrder() {
        OrderRepository repo = Mockito.mock(OrderRepository.class);
        Mockito.when(repo.save(Mockito.any(Order.class))).thenReturn(new Order());
        OrderService service = new OrderService(repo);
        assertNotNull(service.createOrder(new Order()));
    }
} 