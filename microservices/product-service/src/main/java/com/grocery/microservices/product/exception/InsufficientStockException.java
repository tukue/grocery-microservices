package com.grocery.microservices.product.exception;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(Long productId, int requested, int available) {
        super("Product with id " + productId + " has insufficient stock: requested " + requested
                + " but only " + available + " available");
    }
}