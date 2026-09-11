package com.grocery.microservices.order.exception;

public class ProductServiceUnavailableException extends RuntimeException {
    public ProductServiceUnavailableException() {
        super("Product service is unavailable");
    }
}