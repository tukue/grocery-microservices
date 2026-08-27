package com.grocery.microservices.cart.exception;

public class CartItemNotFoundException extends RuntimeException {
    public CartItemNotFoundException(Long cartId, Long itemId) {
        super("Cart item " + itemId + " was not found in cart " + cartId);
    }
}
