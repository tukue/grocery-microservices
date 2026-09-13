package com.grocery.microservices.order.client;

public record StockReservationSnapshot(String reservationKey, Long productId, int quantity, String status) {
}