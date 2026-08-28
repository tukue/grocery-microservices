package com.grocery.microservices.cart.exception;

public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException(Long productId) {
        super("Product " + productId + " was not found");
    }
}
