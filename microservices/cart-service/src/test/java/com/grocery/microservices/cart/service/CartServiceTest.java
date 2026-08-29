package com.grocery.microservices.cart.service;

import com.grocery.microservices.cart.client.CatalogProduct;
import com.grocery.microservices.cart.client.ProductCatalogClient;
import com.grocery.microservices.cart.exception.ProductCatalogUnavailableException;
import com.grocery.microservices.cart.exception.ProductNotFoundException;
import com.grocery.microservices.cart.exception.ProductUnavailableException;
import com.grocery.microservices.cart.model.Cart;
import com.grocery.microservices.cart.model.CartItem;
import com.grocery.microservices.cart.exception.CartItemNotFoundException;
import com.grocery.microservices.cart.repository.CartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.never;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;
import java.util.ArrayList;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
class CartServiceTest {
    private CartRepository cartRepository;
    private ProductCatalogClient productCatalogClient;
    private CartService cartService;
    private Cart testCart;

    @BeforeEach
    void setUp() {
        cartRepository = Mockito.mock(CartRepository.class);
        productCatalogClient = Mockito.mock(ProductCatalogClient.class);
        cartService = new CartService(cartRepository, productCatalogClient);
        testCart = new Cart();
        testCart.setId(1L);
        testCart.setItems(new ArrayList<>());
    }

    @Test
    void testCreateCart() {
        // Arrange
        when(cartRepository.save(Mockito.any(Cart.class))).thenReturn(testCart);
        // Act
        var createdCartDTO = cartService.createCart("customer-1");
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
        testCart.setUserId("customer-1");
        var foundCartDTO = cartService.getCartById(1L, "customer-1");
        assertNotNull(foundCartDTO);
        assertEquals(1L, foundCartDTO.getId());
        // Test not found scenario
        assertThrows(Exception.class, () -> cartService.getCartById(2L, "customer-1"));
    }

    @Test
    void testAddItemToCart() {
        // Arrange
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));
        when(cartRepository.save(Mockito.any(Cart.class))).thenReturn(testCart);
        when(productCatalogClient.getProduct(10L)).thenReturn(new CatalogProduct(10L, "Apple", 1.5, true));
        // Act
        testCart.setUserId("customer-1");
        var updatedCartDTO = cartService.addItem(1L, 10L, 2, "customer-1");
        // Assert
        assertNotNull(updatedCartDTO);
        assertEquals(1, updatedCartDTO.getItems().size());
        assertEquals(10L, updatedCartDTO.getItems().get(0).getProductId());
        assertEquals("Apple", updatedCartDTO.getItems().get(0).getProductName());
        assertEquals(1.5, updatedCartDTO.getItems().get(0).getPrice());
        assertEquals(2, updatedCartDTO.getItems().get(0).getQuantity());
    }

    @Test
    void testAddItemRejectsMissingProduct() {
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));
        when(productCatalogClient.getProduct(99L)).thenThrow(new ProductNotFoundException(99L));

        testCart.setUserId("customer-1");
        assertThrows(ProductNotFoundException.class, () -> cartService.addItem(1L, 99L, 2, "customer-1"));

        verify(cartRepository, never()).save(Mockito.any(Cart.class));
    }

    @Test
    void testAddItemRejectsUnavailableProduct() {
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));
        when(productCatalogClient.getProduct(10L)).thenReturn(new CatalogProduct(10L, "Apple", 1.5, false));

        testCart.setUserId("customer-1");
        assertThrows(ProductUnavailableException.class, () -> cartService.addItem(1L, 10L, 2, "customer-1"));

        verify(cartRepository, never()).save(Mockito.any(Cart.class));
    }

    @Test
    void testAddItemDoesNotPersistWhenCatalogIsUnavailable() {
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));
        when(productCatalogClient.getProduct(10L)).thenThrow(new ProductCatalogUnavailableException());

        testCart.setUserId("customer-1");
        assertThrows(ProductCatalogUnavailableException.class, () -> cartService.addItem(1L, 10L, 2, "customer-1"));

        verify(cartRepository, never()).save(Mockito.any(Cart.class));
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
        testCart.setUserId("customer-1");
        var updatedCartDTO = cartService.removeItem(1L, 1L, "customer-1");
        // Assert
        assertNotNull(updatedCartDTO);
        verify(cartRepository, times(1)).save(Mockito.any(Cart.class));
    }

    @Test
    void testRemoveMissingItemFromCart() {
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));

        testCart.setUserId("customer-1");
        assertThrows(CartItemNotFoundException.class, () -> cartService.removeItem(1L, 99L, "customer-1"));

        verify(cartRepository, never()).save(Mockito.any(Cart.class));
    }

    @Test
    void testUpdateItemQuantity() {
        CartItem item = new CartItem();
        item.setId(1L);
        item.setQuantity(2);
        testCart.getItems().add(item);
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));
        when(cartRepository.save(Mockito.any(Cart.class))).thenReturn(testCart);

        testCart.setUserId("customer-1");
        var updatedCartDTO = cartService.updateItemQuantity(1L, 1L, 3, "customer-1");

        assertEquals(3, updatedCartDTO.getItems().get(0).getQuantity());
        verify(cartRepository).save(testCart);
    }

    @Test
    void testUpdateMissingItemQuantityDoesNotPersist() {
        when(cartRepository.findById(1L)).thenReturn(Optional.of(testCart));

        testCart.setUserId("customer-1");
        assertThrows(CartItemNotFoundException.class, () -> cartService.updateItemQuantity(1L, 99L, 3, "customer-1"));

        verify(cartRepository, never()).save(Mockito.any(Cart.class));
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
