package com.grocery.microservices.order.exception;

public class ProductUnavailableException extends RuntimeException {
    public ProductUnavailableException(Long productId) {
        super("Product with id " + productId + " is not available for purchase");
    }
}