package com.grocery.microservices.product.repository;

import com.grocery.microservices.product.model.StockReservation;
import com.grocery.microservices.product.model.StockReservationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StockReservationRepository extends JpaRepository<StockReservation, Long> {
    Optional<StockReservation> findByReservationKey(String reservationKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select sr from StockReservation sr where sr.reservationKey = :key")
    Optional<StockReservation> findByReservationKeyWithLock(@Param("key") String reservationKey);

    long countByStatus(StockReservationStatus status);
}