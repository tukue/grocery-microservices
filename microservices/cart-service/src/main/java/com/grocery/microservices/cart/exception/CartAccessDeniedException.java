package com.grocery.microservices.cart.exception;

public class CartAccessDeniedException extends RuntimeException {
    public CartAccessDeniedException(Long cartId) {
        super("You are not allowed to access cart " + cartId);
    }
}
