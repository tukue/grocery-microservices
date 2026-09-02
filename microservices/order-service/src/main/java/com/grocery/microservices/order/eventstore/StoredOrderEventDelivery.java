package com.grocery.microservices.order.eventstore;

import java.util.UUID;

public record StoredOrderEventDelivery(UUID id, String payload) {
}
