package com.grocery.microservices.cart.client;

public record CatalogProduct(Long id, String name, double price, Boolean available) {
}
