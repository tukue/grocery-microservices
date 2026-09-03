package com.grocery.microservices.order.event;

public record OrderCreatedPayload(Long orderId, String userId, Long cartId, double total) {
}
