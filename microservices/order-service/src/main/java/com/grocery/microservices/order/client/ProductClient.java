package com.grocery.microservices.order.client;

public interface ProductClient {
    ProductSnapshot getProduct(Long productId);
}