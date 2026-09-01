package com.grocery.microservices.cart.exception;

public class InsufficientProductStockException extends RuntimeException {
    public InsufficientProductStockException(Long productId) {
        super("Product " + productId + " does not have enough stock");
    }
}
