package com.grocery.microservices.product.service;

import com.grocery.microservices.product.exception.InsufficientStockException;
import com.grocery.microservices.product.exception.ProductNotAvailableException;
import com.grocery.microservices.product.exception.ProductNotFoundException;
import com.grocery.microservices.product.model.Product;
import com.grocery.microservices.product.model.StockReservation;
import com.grocery.microservices.product.model.StockReservationStatus;
import com.grocery.microservices.product.repository.ProductRepository;
import com.grocery.microservices.product.repository.StockReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StockReservationServiceTest {

    private StockReservationRepository reservationRepository;
    private ProductRepository productRepository;
    private ProductService productService;
    private StockReservationService reservationService;
    private Product product;

    @BeforeEach
    void setUp() {
        reservationRepository = mock(StockReservationRepository.class);
        productRepository = mock(ProductRepository.class);
        productService = mock(ProductService.class);
        reservationService = new StockReservationService(reservationRepository, productRepository, productService);
        product = new Product();
        product.setId(1L);
        product.setName("Milk");
        product.setPrice(10.00);
        product.setAvailable(true);
        product.setStockQuantity(100);
        when(productRepository.findWithLockingById(1L)).thenReturn(Optional.of(product));
        when(reservationRepository.findByReservationKeyWithLock("key-1")).thenReturn(Optional.empty());
    }

    @Test
    void reserveDecrementsStockAndPersistsReservation() {
        when(reservationRepository.save(any(StockReservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockReservation reservation = reservationService.reserve(1L, 3, "key-1");

        assertEquals(97, product.getStockQuantity());
        assertEquals(StockReservationStatus.ACTIVE, reservation.getStatus());
        verify(reservationRepository).save(any(StockReservation.class));
        verify(productRepository).save(product);
        verify(productService).evictProductCache(1L);
    }

    @Test
    void reserveReplaysExistingActiveReservationWithoutDoubleDecrement() {
        StockReservation existing = new StockReservation("key-1", 1L, 3);
        existing.setStatus(StockReservationStatus.ACTIVE);
        when(reservationRepository.findByReservationKeyWithLock("key-1")).thenReturn(Optional.of(existing));

        StockReservation result = reservationService.reserve(1L, 3, "key-1");

        assertEquals(existing, result);
        assertEquals(100, product.getStockQuantity());
        verify(reservationRepository, never()).save(any(StockReservation.class));
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void reserveRejectsWhenStockInsufficient() {
        product.setStockQuantity(2);

        InsufficientStockException exception = assertThrows(InsufficientStockException.class,
                () -> reservationService.reserve(1L, 5, "key-1"));

        assertTrue(exception.getMessage().contains("only 2 available"));
        verify(reservationRepository, never()).save(any(StockReservation.class));
    }

    @Test
    void reserveRejectsWhenProductUnavailable() {
        product.setAvailable(false);

        assertThrows(ProductNotAvailableException.class,
                () -> reservationService.reserve(1L, 1, "key-1"));
    }

    @Test
    void reserveRejectsWhenProductMissing() {
        when(productRepository.findWithLockingById(99L)).thenReturn(Optional.empty());

        assertThrows(ProductNotFoundException.class, () -> reservationService.reserve(99L, 1, "key-1"));
    }

    @Test
    void reserveReactivatesReleasedReservationForRetry() {
        StockReservation released = new StockReservation("key-1", 1L, 3);
        released.setStatus(StockReservationStatus.RELEASED);
        when(reservationRepository.findByReservationKeyWithLock("key-1")).thenReturn(Optional.of(released));
        when(reservationRepository.save(any(StockReservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        StockReservation result = reservationService.reserve(1L, 3, "key-1");

        assertEquals(StockReservationStatus.ACTIVE, result.getStatus());
        assertEquals(97, product.getStockQuantity());
    }

    @Test
    void releaseRestoresStockAndMarksReleased() {
        StockReservation active = new StockReservation("key-1", 1L, 3);
        active.setStatus(StockReservationStatus.ACTIVE);
        when(reservationRepository.findByReservationKey("key-1")).thenReturn(Optional.of(active));
        when(reservationRepository.save(any(StockReservation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        int released = reservationService.release("key-1");

        assertEquals(3, released);
        assertEquals(103, product.getStockQuantity());
        assertEquals(StockReservationStatus.RELEASED, active.getStatus());
        assertNotNull(active.getReleasedAt());
    }

    @Test
    void releaseIsIdempotentForAlreadyReleasedReservation() {
        StockReservation released = new StockReservation("key-1", 1L, 3);
        released.setStatus(StockReservationStatus.RELEASED);
        when(reservationRepository.findByReservationKey("key-1")).thenReturn(Optional.of(released));

        int count = reservationService.release("key-1");

        assertEquals(0, count);
        assertEquals(100, product.getStockQuantity());
        verify(productRepository, never()).save(any(Product.class));
        verify(reservationRepository, times(0)).save(any(StockReservation.class));
    }

    @Test
    void releaseForUnknownKeyIsNoOp() {
        when(reservationRepository.findByReservationKey("unknown")).thenReturn(Optional.empty());

        int count = reservationService.release("unknown");

        assertEquals(0, count);
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void reserveRejectsMissingKey() {
        assertThrows(IllegalArgumentException.class, () -> reservationService.reserve(1L, 1, "  "));
    }

    @Test
    void reserveRejectsExcessiveQuantity() {
        assertThrows(IllegalArgumentException.class,
                () -> reservationService.reserve(1L, 10001, "key-overflow"));
    }
}