package com.example.cart.service;

import com.example.cart.model.Cart;
import com.example.cart.repository.CartRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;

class CartServiceTest {
    @Test
    void testCreateCart() {
        CartRepository repo = Mockito.mock(CartRepository.class);
        Mockito.when(repo.save(Mockito.any(Cart.class))).thenReturn(new Cart());
        CartService service = new CartService(repo);
        assertNotNull(service.createCart());
    }
} 