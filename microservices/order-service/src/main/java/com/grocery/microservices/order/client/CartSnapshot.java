package com.grocery.microservices.order.client;

import java.util.List;

public record CartSnapshot(Long id, String status, List<CartItemSnapshot> items) {
    public CartSnapshot(Long id, List<CartItemSnapshot> items) {
        this(id, "OPEN", items);
    }

    public boolean isOpen() {
        return status == null || "OPEN".equals(status);
    }
}
