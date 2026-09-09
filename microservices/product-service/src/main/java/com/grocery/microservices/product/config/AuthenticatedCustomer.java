package com.grocery.microservices.product.config;

public record AuthenticatedCustomer(String customerId) {

    public AuthenticatedCustomer {
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("customerId is required");
        }
    }
}
