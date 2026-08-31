package com.grocery.microservices.order.exception;

public class OrderAccessDeniedException extends RuntimeException {
    public OrderAccessDeniedException(Long orderId) {
        super("You are not allowed to access order " + orderId);
    }
}
