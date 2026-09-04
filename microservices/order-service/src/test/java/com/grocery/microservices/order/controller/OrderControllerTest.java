package com.grocery.microservices.order.controller;

import com.grocery.microservices.order.config.SecurityConfig;
import com.grocery.microservices.order.dto.CheckoutRequest;
import com.grocery.microservices.order.exception.InvalidOrderStateException;
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
import org.springframework.security.test.context.support.WithMockUser;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@ActiveProfiles("test")
@WebMvcTest(OrderController.class)
@Import(OrderControllerTest.TestSecurityConfig.class)
@WithMockUser(username = "customer-1")
public class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void checkoutCreatesOrderFromCart() throws Exception {
        CheckoutRequest checkoutRequest = new CheckoutRequest();
        checkoutRequest.setCartId(1L);

        Order savedOrder = new Order();
        savedOrder.setId(1L);
        savedOrder.setStatus(OrderStatus.PENDING);
        savedOrder.setTotal(24.50);

        when(orderService.checkout(1L, "customer-1", null)).thenReturn(savedOrder);

        mockMvc.perform(post("/orders/checkout")
                        .with(user("customer-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutRequest)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/orders/1"))
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.total").value(24.50));
    }

    @Test
    public void rejectsInvalidCheckoutPayloadBeforeCreatingOrder() throws Exception {
        CheckoutRequest checkoutRequest = new CheckoutRequest();
        checkoutRequest.setCartId(0L);

        mockMvc.perform(post("/orders/checkout")
                        .with(user("customer-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation Failed"))
                .andExpect(jsonPath("$.validationErrors.cartId").value("Cart ID must be positive"));

        verifyNoInteractions(orderService);
    }

    @Test
    public void testUpdateStatus() throws Exception {
        Order updatedOrder = new Order();
        updatedOrder.setId(1L);
        updatedOrder.setStatus(OrderStatus.COMPLETED);

        when(orderService.updateOrderStatus(any(Long.class), any(OrderStatus.class), any(String.class))).thenReturn(updatedOrder);

        mockMvc.perform(patch("/orders/1/status")
                        .param("status", "COMPLETED")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    public void rejectsInvalidOrderStatusTransition() throws Exception {
        when(orderService.updateOrderStatus(1L, OrderStatus.PENDING, "customer-1"))
                .thenThrow(new InvalidOrderStateException("A PENDING order can only be COMPLETED or CANCELLED"));

        mockMvc.perform(patch("/orders/1/status")
                        .param("status", "PENDING"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A PENDING order can only be COMPLETED or CANCELLED"));
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
