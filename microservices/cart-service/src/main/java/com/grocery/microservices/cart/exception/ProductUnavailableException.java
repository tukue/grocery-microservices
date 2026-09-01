package com.grocery.microservices.cart.exception;

public class ProductUnavailableException extends RuntimeException {
    public ProductUnavailableException(Long productId) {
        super("Product " + productId + " is out of stock");
    }
}
