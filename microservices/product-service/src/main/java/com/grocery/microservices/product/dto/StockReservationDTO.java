package com.grocery.microservices.product.dto;

import com.grocery.microservices.product.model.StockReservation;

public class StockReservationDTO {
    private Long id;
    private String reservationKey;
    private Long productId;
    private int quantity;
    private String status;

    public StockReservationDTO() {
    }

    public StockReservationDTO(StockReservation reservation) {
        this.id = reservation.getId();
        this.reservationKey = reservation.getReservationKey();
        this.productId = reservation.getProductId();
        this.quantity = reservation.getQuantity();
        this.status = reservation.getStatus().name();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReservationKey() {
        return reservationKey;
    }

    public void setReservationKey(String reservationKey) {
        this.reservationKey = reservationKey;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}