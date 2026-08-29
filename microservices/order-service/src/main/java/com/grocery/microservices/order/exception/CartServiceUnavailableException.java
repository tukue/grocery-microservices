package com.grocery.microservices.order.exception;

public class CartServiceUnavailableException extends RuntimeException {
    public CartServiceUnavailableException() {
        super("Cart service is currently unavailable");
    }
}
