package com.grocery.microservices.order.exception;

public class InsufficientProductStockException extends RuntimeException {
    public InsufficientProductStockException(Long productId, int requested, int available) {
        super("Product with id " + productId + " has insufficient stock: requested " + requested
                + " but only " + available + " available");
    }
}