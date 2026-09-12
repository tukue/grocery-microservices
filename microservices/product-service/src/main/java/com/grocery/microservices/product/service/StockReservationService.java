package com.grocery.microservices.product.service;

import com.grocery.microservices.product.exception.InsufficientStockException;
import com.grocery.microservices.product.exception.ProductNotAvailableException;
import com.grocery.microservices.product.exception.ProductNotFoundException;
import com.grocery.microservices.product.model.Product;
import com.grocery.microservices.product.model.StockReservation;
import com.grocery.microservices.product.model.StockReservationStatus;
import com.grocery.microservices.product.repository.ProductRepository;
import com.grocery.microservices.product.repository.StockReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Idempotent, pessimistic-lock guarded stock reservation.
 * <p>
 * {@code reserve} decrements available stock exactly once per reservation key:
 * repeats return the existing reservation, and a previously released key is
 * re-activated (the checkout retry case after a compensated failure).
 * {@code release} returns stock for an active reservation and is a no-op for
 * unknown or already-released keys. Both use a pessimistic write lock so
 * concurrent checkouts of the same product serialize instead of overselling.
 */
@Service
public class StockReservationService {

    private static final Logger log = LoggerFactory.getLogger(StockReservationService.class);

    private final StockReservationRepository reservationRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;

    public StockReservationService(StockReservationRepository reservationRepository,
                                   ProductRepository productRepository,
                                   ProductService productService) {
        this.reservationRepository = reservationRepository;
        this.productRepository = productRepository;
        this.productService = productService;
    }

    @Transactional
    public StockReservation reserve(Long productId, int quantity, String reservationKey) {
        if (reservationKey == null || reservationKey.isBlank()) {
            throw new IllegalArgumentException("Reservation key must not be blank");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("Reservation quantity must be positive");
        }

        StockReservation existing = reservationRepository.findByReservationKey(reservationKey).orElse(null);
        if (existing != null && existing.getStatus() == StockReservationStatus.ACTIVE) {
            log.info("EVENT=STOCK_RESERVATION_REPLAY KEY={} PRODUCT_ID={}", reservationKey, productId);
            return existing;
        }

        Product product = productRepository.findWithLockingById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        StockReservation rechecked = reservationRepository.findByReservationKey(reservationKey).orElse(null);
        if (rechecked != null && rechecked.getStatus() == StockReservationStatus.ACTIVE) {
            return rechecked;
        }

        if (!product.isAvailable()) {
            throw new ProductNotAvailableException(productId);
        }
        if (product.getStockQuantity() < quantity) {
            throw new InsufficientStockException(productId, quantity, product.getStockQuantity());
        }

        product.setStockQuantity(product.getStockQuantity() - quantity);
        productRepository.save(product);
        productService.evictProductCache(productId);

        StockReservation reservation = rechecked;
        if (reservation == null) {
            reservation = reservationRepository.save(new StockReservation(reservationKey, productId, quantity));
        } else {
            reservation.setStatus(StockReservationStatus.ACTIVE);
            reservation.setReleasedAt(null);
            reservation = reservationRepository.save(reservation);
        }
        log.info("EVENT=STOCK_RESERVED KEY={} PRODUCT_ID={} QUANTITY={}", reservationKey, productId, quantity);
        return reservation;
    }

    @Transactional
    public int release(String reservationKey) {
        if (reservationKey == null || reservationKey.isBlank()) {
            throw new IllegalArgumentException("Reservation key must not be blank");
        }
        StockReservation reservation = reservationRepository.findByReservationKey(reservationKey).orElse(null);
        if (reservation == null) {
            log.info("EVENT=STOCK_RELEASE_SKIP_UNKNOWN KEY={}", reservationKey);
            return 0;
        }
        if (reservation.getStatus() == StockReservationStatus.RELEASED) {
            log.info("EVENT=STOCK_RELEASE_SKIP_ALREADY RELEASED KEY={}", reservationKey);
            return 0;
        }

        Product product = productRepository.findWithLockingById(reservation.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(reservation.getProductId()));
        product.setStockQuantity(product.getStockQuantity() + reservation.getQuantity());
        productRepository.save(product);
        productService.evictProductCache(reservation.getProductId());

        reservation.setStatus(StockReservationStatus.RELEASED);
        reservation.setReleasedAt(LocalDateTime.now());
        reservationRepository.save(reservation);
        log.info("EVENT=STOCK_RELEASED KEY={} PRODUCT_ID={} QUANTITY={}",
                reservationKey, reservation.getProductId(), reservation.getQuantity());
        return reservation.getQuantity();
    }
}