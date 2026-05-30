package com.example.order.dto;

import com.example.order.model.OrderStatus;
import java.time.LocalDateTime;
import java.util.List;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;

public class OrderDTO {
    private Long id;
    private String userId;
    private OrderStatus status;
    private LocalDateTime orderDate;
    private double total;
    
    @NotNull(message = "Cart ID must not be null")
    private Long cartId;
    @NotEmpty(message = "Product IDs must not be empty")
    private List<Long> productIds;

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public LocalDateTime getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDateTime orderDate) {
        this.orderDate = orderDate;
    }

    public double getTotal() {
        return total;
    }

    public void setTotal(double total) {
        this.total = total;
    }

    public Long getCartId() {
        return cartId;
    }

    public void setCartId(Long cartId) {
        this.cartId = cartId;
    }

    public List<Long> getProductIds() {
        return productIds;
    }

    public void setProductIds(List<Long> productIds) {
        this.productIds = productIds;
    }
} 