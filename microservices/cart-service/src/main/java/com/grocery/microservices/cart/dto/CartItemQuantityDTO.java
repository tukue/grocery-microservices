package com.grocery.microservices.cart.dto;

import jakarta.validation.constraints.Min;

public class CartItemQuantityDTO {
    @Min(value = 1, message = "Quantity must be at least 1")
    private int quantity;

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
