package com.grocery.microservices.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class CheckoutRequest {
    @NotNull(message = "Cart ID must not be null")
    @Positive(message = "Cart ID must be positive")
    private Long cartId;

    @Size(max = 64, message = "Idempotency key must not exceed 64 characters")
    private String idempotencyKey;

    public Long getCartId() {
        return cartId;
    }

    public void setCartId(Long cartId) {
        this.cartId = cartId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
