package com.example.order.model;

import jakarta.persistence.*;

@Entity
@Table(name = "orders")
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String userId;
    private double total;
    
    @Enumerated(EnumType.STRING)
    private OrderStatus status;
    
    private java.time.LocalDateTime orderDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public java.time.LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(java.time.LocalDateTime orderDate) { this.orderDate = orderDate; }
} 