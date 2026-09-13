package com.grocery.microservices.product.controller;

import com.grocery.microservices.product.dto.ReserveStockRequest;
import com.grocery.microservices.product.dto.StockReservationDTO;
import com.grocery.microservices.product.model.StockReservation;
import com.grocery.microservices.product.service.StockReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/products")
public class StockReservationController {

    private final StockReservationService stockReservationService;

    public StockReservationController(StockReservationService stockReservationService) {
        this.stockReservationService = stockReservationService;
    }

    @PostMapping("/{productId}/reservations")
    public ResponseEntity<StockReservationDTO> reserve(@PathVariable Long productId,
                                       @Valid @RequestBody ReserveStockRequest request) {
        StockReservation reservation = stockReservationService.reserve(
                productId, request.getQuantity(), request.getReservationKey());
        return ResponseEntity.status(HttpStatus.CREATED).body(new StockReservationDTO(reservation));
    }

    @DeleteMapping("/reservations/{reservationKey}")
    public ResponseEntity<Void> release(@PathVariable String reservationKey) {
        stockReservationService.release(reservationKey);
        return ResponseEntity.noContent().build();
    }
}