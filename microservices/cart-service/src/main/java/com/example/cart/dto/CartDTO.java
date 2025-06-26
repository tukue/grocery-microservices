package com.example.cart.dto;

import java.util.List;

public class CartDTO {
    private Long id;
    private List<CartItemDTO> items;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public List<CartItemDTO> getItems() { return items; }
    public void setItems(List<CartItemDTO> items) { this.items = items; }
} 