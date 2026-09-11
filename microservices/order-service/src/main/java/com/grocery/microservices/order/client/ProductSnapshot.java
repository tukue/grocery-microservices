package com.grocery.microservices.order.client;

public record ProductSnapshot(Long id, String name, double price, boolean available,
                              int stockQuantity, String imageUrl) {
}