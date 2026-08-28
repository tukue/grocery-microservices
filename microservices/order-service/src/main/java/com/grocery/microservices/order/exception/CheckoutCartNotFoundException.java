package com.grocery.microservices.order.exception;

public class CheckoutCartNotFoundException extends RuntimeException {
    public CheckoutCartNotFoundException(Long cartId) {
        super("Cart not found with id: " + cartId);
    }
}
