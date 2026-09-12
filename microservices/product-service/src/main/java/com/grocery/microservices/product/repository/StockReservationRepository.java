package com.grocery.microservices.product.repository;

import com.grocery.microservices.product.model.StockReservation;
import com.grocery.microservices.product.model.StockReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StockReservationRepository extends JpaRepository<StockReservation, Long> {
    Optional<StockReservation> findByReservationKey(String reservationKey);

    long countByStatus(StockReservationStatus status);
}