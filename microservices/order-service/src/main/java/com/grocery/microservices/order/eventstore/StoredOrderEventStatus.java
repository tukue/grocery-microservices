package com.grocery.microservices.order.eventstore;

public enum StoredOrderEventStatus {
    PENDING,
    PROCESSING,
    FAILED,
    PUBLISHED
}
