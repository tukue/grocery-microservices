package com.grocery.microservices.cart.client;

public interface ProductCatalogClient {
    CatalogProduct getProduct(Long productId);
}
