package com.grocery.microservices.cart.exception;

public class ProductCatalogUnavailableException extends RuntimeException {
    public ProductCatalogUnavailableException() {
        super("Product catalog is temporarily unavailable");
    }
}
