package com.grocery.microservices.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class CheckoutRequest {
    @NotNull(message = "Cart ID must not be null")
    @Positive(message = "Cart ID must be positive")
    private Long cartId;

    public Long getCartId() {
        return cartId;
    }

    public void setCartId(Long cartId) {
        this.cartId = cartId;
    }
}
