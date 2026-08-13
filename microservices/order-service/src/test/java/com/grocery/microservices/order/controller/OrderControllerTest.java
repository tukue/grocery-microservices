package com.grocery.microservices.order.controller;

import com.grocery.microservices.order.config.SecurityConfig;
import com.grocery.microservices.order.dto.OrderDTO;
import com.grocery.microservices.order.model.Order;
import com.grocery.microservices.order.model.OrderStatus;
import com.grocery.microservices.order.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@WebMvcTest(OrderController.class)
@Import(OrderControllerTest.TestSecurityConfig.class)
public class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testCreateOrder() throws Exception {
        OrderDTO orderDTO = new OrderDTO();
        orderDTO.setUserId("customer-1");
        orderDTO.setCartId(1L);
        orderDTO.setProductIds(Collections.singletonList(101L));
        orderDTO.setTotal(24.50);

        Order savedOrder = new Order();
        savedOrder.setId(1L);
        savedOrder.setStatus(OrderStatus.PENDING);

        when(orderService.createOrder(any(Order.class))).thenReturn(savedOrder);

        mockMvc.perform(post("/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    public void rejectsInvalidCheckoutPayloadBeforeCreatingOrder() throws Exception {
        OrderDTO orderDTO = new OrderDTO();
        orderDTO.setUserId(" ");
        orderDTO.setCartId(1L);
        orderDTO.setProductIds(Collections.singletonList(0L));
        orderDTO.setTotal(0);

        mockMvc.perform(post("/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation Failed"))
                .andExpect(jsonPath("$.validationErrors.userId").value("User ID must not be blank"))
                .andExpect(jsonPath("$.validationErrors.total").value("Order total must be positive"))
                .andExpect(jsonPath("$['validationErrors']['productIds[0]']").value("Product ID must be positive"));

        verifyNoInteractions(orderService);
    }

    @Test
    public void testUpdateStatus() throws Exception {
        Order updatedOrder = new Order();
        updatedOrder.setId(1L);
        updatedOrder.setStatus(OrderStatus.COMPLETED);

        when(orderService.updateOrderStatus(any(Long.class), any(OrderStatus.class))).thenReturn(updatedOrder);

        mockMvc.perform(patch("/orders/1/status")
                        .param("status", "COMPLETED")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @TestConfiguration
    @Profile("test")
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf().disable().authorizeHttpRequests().anyRequest().permitAll();
            return http.build();
        }
        @Bean
        public com.grocery.microservices.order.config.JwtUtil jwtUtil() {
            com.grocery.microservices.order.config.JwtUtil jwtUtil = new com.grocery.microservices.order.config.JwtUtil();
            ReflectionTestUtils.setField(jwtUtil, "secret", UUID.randomUUID().toString());
            return jwtUtil;
        }
    }
}
