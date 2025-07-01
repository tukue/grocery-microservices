package com.example.cart.service;

import com.example.cart.model.Cart;
import com.example.cart.model.CartItem;
import com.example.cart.repository.CartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;
import java.util.ArrayList;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
class CartServiceTest {
    private CartRepository cartRepository;
    private CartService cartService;
    private Cart testCart;

    @BeforeEach
    void setUp() {
        cartRepository = Mockito.mock(CartRepository.class);
        cartService = new CartService(cartRepository);
        testCart = new Cart();
        testCart.setId(1L);
        testCart.setItems(new ArrayList<>());
    }

    @Test
    void testCreateCart() {
        // Arrange
        when(cartRepository.save(Mockito.any(Cart.class))).thenReturn(testCart);
        // Act
        var createdCartDTO = cartService.createCart();
        // Assert
        assertNotNull(createdCartDTO);
        assertEquals(1L, createdCartDTO.getId());
        verify(cartRepository, times(1)).save(Mockito.any(Cart.class));
    }

    @Test
    void testGetCartById() {
        // Arrange
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));
        when(cartRepository.findById(2L)).thenReturn(Optional.empty());
        // Act & Assert
        var foundCartDTO = cartService.getCartById(1L);
        assertNotNull(foundCartDTO);
        assertEquals(1L, foundCartDTO.getId());
        // Test not found scenario
        assertThrows(Exception.class, () -> cartService.getCartById(2L));
    }

    @Test
    void testAddItemToCart() {
        // Arrange
        CartItem item = new CartItem();
        item.setProductName("Apple");
        item.setPrice(1.5);
        item.setQuantity(2);
        // Do NOT add item to testCart.getItems() here!
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));
        when(cartRepository.save(Mockito.any(Cart.class))).thenReturn(testCart);
        // Act
        var updatedCartDTO = cartService.addItem(1L, item);
        // Assert
        assertNotNull(updatedCartDTO);
        assertEquals(1, updatedCartDTO.getItems().size());
        assertEquals("Apple", updatedCartDTO.getItems().get(0).getProductName());
        assertEquals(2, updatedCartDTO.getItems().get(0).getQuantity());
    }

    @Test
    void testRemoveItemFromCart() {
        // Arrange
        CartItem item = new CartItem();
        item.setId(1L);
        item.setProductName("Apple");
        item.setPrice(1.5);
        item.setQuantity(2);
        testCart.getItems().add(item);
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));
        when(cartRepository.save(Mockito.any(Cart.class))).thenReturn(testCart);
        // Act
        var updatedCartDTO = cartService.removeItem(1L, 1L);
        // Assert
        assertNotNull(updatedCartDTO);
        verify(cartRepository, times(1)).save(Mockito.any(Cart.class));
    }

    @Test
    void testSaveCart() {
        // Arrange
        when(cartRepository.save(Mockito.any(Cart.class))).thenReturn(testCart);
        // Act
        Cart savedCart = cartService.saveCart(testCart);
        // Assert
        assertNotNull(savedCart);
        assertEquals(1L, savedCart.getId());
        verify(cartRepository, times(1)).save(Mockito.any(Cart.class));
    }
} 