package com.grocery.microservices.order.exception;

public class EmptyCartException extends RuntimeException {
    public EmptyCartException(Long cartId) {
        super("Cart with id " + cartId + " is empty");
    }
}
