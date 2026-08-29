package com.grocery.microservices.order.client;

public record CartItemSnapshot(Long id, Long productId, String productName, double price, int quantity) {
}
