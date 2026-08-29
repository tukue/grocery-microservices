package com.grocery.microservices.order.exception;

public class CartAccessDeniedException extends RuntimeException {
    public CartAccessDeniedException() {
        super("You are not allowed to access this cart");
    }
}
