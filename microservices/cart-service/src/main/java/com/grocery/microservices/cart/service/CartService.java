package com.grocery.microservices.cart.service;

import com.grocery.microservices.cart.dto.CartDTO;
import com.grocery.microservices.cart.dto.CartItemDTO;
import com.grocery.microservices.cart.exception.CartItemNotFoundException;
import com.grocery.microservices.cart.exception.CartNotFoundException;
import com.grocery.microservices.cart.model.Cart;
import com.grocery.microservices.cart.model.CartItem;
import com.grocery.microservices.cart.repository.CartRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.stream.Collectors;

@Service
public class CartService {
    private static final Logger log = LoggerFactory.getLogger(CartService.class);
    private final CartRepository repo;
    public CartService(CartRepository repo) { this.repo = repo; }

    @Transactional
    @Retryable(retryFor = { SQLException.class }, maxAttempts = 3, backoff = @Backoff(delay = 2000))
    public CartDTO createCart() {
        Cart cart = repo.save(new Cart());
        log.info("EVENT=CART_CREATED CART_ID={}", cart.getId());
        return toDTO(cart);
    }

    public CartDTO getCartById(Long id) {
        Cart cart = repo.findById(id).orElseThrow(() -> new CartNotFoundException(id));
        return toDTO(cart);
    }

    @Transactional
    @Retryable(retryFor = { SQLException.class }, maxAttempts = 3, backoff = @Backoff(delay = 2000))
    public CartDTO addItem(Long cartId, CartItem item) {
        Cart cart = repo.findById(cartId).orElseThrow(() -> new CartNotFoundException(cartId));
        cart.getItems().add(item);
        Cart updatedCart = repo.save(cart);
        log.info("EVENT=ITEM_ADDED_TO_CART CART_ID={} PRODUCT={} QTY={}", 
            cartId, item.getProductName(), item.getQuantity());
        return toDTO(updatedCart);
    }

    @Transactional
    @Retryable(retryFor = { SQLException.class }, maxAttempts = 3, backoff = @Backoff(delay = 2000))
    public CartDTO removeItem(Long cartId, Long itemId) {
        Cart cart = repo.findById(cartId).orElseThrow(() -> new CartNotFoundException(cartId));
        CartItem item = getCartItem(cart, cartId, itemId);
        cart.getItems().remove(item);
        Cart updatedCart = repo.save(cart);
        log.info("EVENT=ITEM_REMOVED_FROM_CART CART_ID={} ITEM_ID={}", cartId, itemId);
        return toDTO(updatedCart);
    }

    @Transactional
    @Retryable(retryFor = { SQLException.class }, maxAttempts = 3, backoff = @Backoff(delay = 2000))
    public CartDTO updateItemQuantity(Long cartId, Long itemId, int quantity) {
        Cart cart = repo.findById(cartId).orElseThrow(() -> new CartNotFoundException(cartId));
        CartItem item = getCartItem(cart, cartId, itemId);
        item.setQuantity(quantity);
        Cart updatedCart = repo.save(cart);
        log.info("EVENT=CART_ITEM_QUANTITY_UPDATED CART_ID={} ITEM_ID={} QUANTITY={}", cartId, itemId, quantity);
        return toDTO(updatedCart);
    }

    private CartDTO toDTO(Cart cart) {
        CartDTO dto = new CartDTO();
        dto.setId(cart.getId());
        if (cart.getItems() != null) {
            dto.setItems(cart.getItems().stream().map(this::toDTO).collect(Collectors.toList()));
        }
        return dto;
    }

    private CartItemDTO toDTO(CartItem item) {
        CartItemDTO dto = new CartItemDTO();
        dto.setId(item.getId());
        dto.setProductName(item.getProductName());
        dto.setPrice(item.getPrice());
        dto.setQuantity(item.getQuantity());
        return dto;
    }

    private CartItem getCartItem(Cart cart, Long cartId, Long itemId) {
        return cart.getItems().stream()
                .filter(item -> itemId.equals(item.getId()))
                .findFirst()
                .orElseThrow(() -> new CartItemNotFoundException(cartId, itemId));
    }

    @Transactional
    public Cart saveCart(Cart cart) {
        return repo.save(cart);
    }
}
