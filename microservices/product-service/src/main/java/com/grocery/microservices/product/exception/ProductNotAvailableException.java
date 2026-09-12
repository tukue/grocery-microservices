package com.grocery.microservices.product.exception;

public class ProductNotAvailableException extends RuntimeException {
    public ProductNotAvailableException(Long productId) {
        super("Product with id " + productId + " is not available for purchase");
    }
}