package com.grocery.microservices.order.client;

import java.util.List;

public record CartSnapshot(Long id, List<CartItemSnapshot> items) {
}
