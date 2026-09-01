package com.grocery.microservices.cart.exception;

public class InsufficientProductStockException extends RuntimeException {
    public InsufficientProductStockException(Long productId, int requestedQuantity, int availableStock) {
        super("Product " + productId + " does not have enough stock. Requested: "
                + requestedQuantity + ", Available: " + availableStock);
    }
}
