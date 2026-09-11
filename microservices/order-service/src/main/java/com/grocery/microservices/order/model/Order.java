package com.grocery.microservices.order.model;

import jakarta.persistence.*;

@Entity
@Table(name = "orders", indexes = {
        @Index(name = "idx_orders_user_id", columnList = "user_id"),
        @Index(name = "idx_orders_status", columnList = "status")
}, uniqueConstraints = @UniqueConstraint(name = "uk_orders_user_idempotency", columnNames = {"user_id", "idempotency_key"}))
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id")
    private String userId;
    @Column(name = "cart_id")
    private Long cartId;
    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;
    private double total;

    @ElementCollection
    @CollectionTable(name = "order_lines", joinColumns = @JoinColumn(name = "order_id"))
    private java.util.List<OrderLine> orderLines = new java.util.ArrayList<>();

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @Column(name = "order_date")
    private java.time.LocalDateTime orderDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Long getCartId() { return cartId; }
    public void setCartId(Long cartId) { this.cartId = cartId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public java.util.List<OrderLine> getOrderLines() { return orderLines; }
    public void setOrderLines(java.util.List<OrderLine> orderLines) { this.orderLines = new java.util.ArrayList<>(orderLines); }
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public java.time.LocalDateTime getOrderDate() { return orderDate; }
    public void setOrderDate(java.time.LocalDateTime orderDate) { this.orderDate = orderDate; }
}
