package com.grocery.microservices.summary.event;

public record OrderCreatedPayload(Long orderId, String userId, Long cartId, double total) {
}
