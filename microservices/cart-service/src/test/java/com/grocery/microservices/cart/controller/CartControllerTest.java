package com.grocery.microservices.cart.controller;

import com.grocery.microservices.cart.dto.CartDTO;
import com.grocery.microservices.cart.dto.CartItemQuantityDTO;
import com.grocery.microservices.cart.exception.CartItemNotFoundException;
import com.grocery.microservices.cart.service.CartService;
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

import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@WebMvcTest(CartController.class)
@Import(CartControllerTest.TestSecurityConfig.class)
public class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CartService cartService;

    @Autowired
    private ObjectMapper objectMapper;

    @TestConfiguration
    @Profile("test")
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf().disable().authorizeHttpRequests().anyRequest().permitAll();
            return http.build();
        }
        @Bean
        public com.grocery.microservices.cart.config.JwtUtil jwtUtil() {
            com.grocery.microservices.cart.config.JwtUtil jwtUtil = new com.grocery.microservices.cart.config.JwtUtil();
            ReflectionTestUtils.setField(jwtUtil, "secret", UUID.randomUUID().toString());
            return jwtUtil;
        }
    }

    @Test
    public void testGetCartById() throws Exception {
        CartDTO cart = new CartDTO();
        cart.setId(1L);

        when(cartService.getCartById(anyLong())).thenReturn(cart);

        mockMvc.perform(get("/carts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    public void testCreateCart() throws Exception {
        CartDTO cartDTO = new CartDTO();
        CartDTO returnedCart = new CartDTO();
        returnedCart.setId(1L);

        when(cartService.createCart()).thenReturn(returnedCart);

        mockMvc.perform(post("/carts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cartDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    public void returnsNotFoundWhenRemovingMissingCartItem() throws Exception {
        when(cartService.removeItem(1L, 99L))
                .thenThrow(new CartItemNotFoundException(1L, 99L));

        mockMvc.perform(delete("/carts/1/items/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Cart item 99 was not found in cart 1"));
    }

    @Test
    public void updatesCartItemQuantity() throws Exception {
        CartItemQuantityDTO quantityDTO = new CartItemQuantityDTO();
        quantityDTO.setQuantity(3);
        CartDTO updatedCart = new CartDTO();
        updatedCart.setId(1L);

        when(cartService.updateItemQuantity(1L, 1L, 3)).thenReturn(updatedCart);

        mockMvc.perform(patch("/carts/1/items/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(quantityDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    public void rejectsNonPositiveCartItemQuantity() throws Exception {
        CartItemQuantityDTO quantityDTO = new CartItemQuantityDTO();

        mockMvc.perform(patch("/carts/1/items/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(quantityDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.quantity").value("Quantity must be at least 1"));

        verifyNoInteractions(cartService);
    }
}
