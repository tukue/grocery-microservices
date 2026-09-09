package com.grocery.microservices.summary.service;

import com.grocery.microservices.summary.exception.SummaryNotFoundException;
import com.grocery.microservices.summary.model.Summary;
import com.grocery.microservices.summary.repository.SummaryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@ActiveProfiles("test")
class SummaryServiceTest {

    @Mock
    private SummaryRepository summaryRepository;

    @InjectMocks
    private SummaryService summaryService;

    private Summary testSummary;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        testSummary = new Summary();
        testSummary.setId(1L);
        testSummary.setUserId("customer-1");
        testSummary.setOrderId(1L);
        testSummary.setTotalAmount(BigDecimal.valueOf(99.99));
        testSummary.setItemCount(3);
        testSummary.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void testGetSummariesByCustomer() {
        when(summaryRepository.findByUserIdOrderByCreatedAtDesc("customer-1"))
                .thenReturn(Arrays.asList(testSummary));

        List<Summary> results = summaryService.getSummariesByCustomer("customer-1");

        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("customer-1", results.get(0).getUserId());
        verify(summaryRepository, times(1)).findByUserIdOrderByCreatedAtDesc("customer-1");
    }

    @Test
    void testGetSummariesByCustomerNotFound() {
        when(summaryRepository.findByUserIdOrderByCreatedAtDesc("nonexistent"))
                .thenReturn(Arrays.asList());

        List<Summary> results = summaryService.getSummariesByCustomer("nonexistent");

        assertNotNull(results);
        assertTrue(results.isEmpty());
        verify(summaryRepository, times(1)).findByUserIdOrderByCreatedAtDesc("nonexistent");
    }

    @Test
    void testGetSummaryByOrder() {
        when(summaryRepository.findByOrderIdAndUserId(1L, "customer-1")).thenReturn(Optional.of(testSummary));

        Summary result = summaryService.getSummaryByOrder("customer-1", 1L);

        assertEquals(testSummary, result);
        verify(summaryRepository).findByOrderIdAndUserId(1L, "customer-1");
    }

    @Test
    void testGetSummaryByOrderIsNotFoundForAnotherCustomer() {
        when(summaryRepository.findByOrderIdAndUserId(1L, "customer-2")).thenReturn(Optional.empty());

        assertThrows(SummaryNotFoundException.class, () -> summaryService.getSummaryByOrder("customer-2", 1L));
        verify(summaryRepository).findByOrderIdAndUserId(1L, "customer-2");
    }

    @Test
    void testGetTotalSpending() {
        Summary summary1 = new Summary();
        summary1.setUserId("customer-1");
        summary1.setTotalAmount(BigDecimal.valueOf(100.00));

        Summary summary2 = new Summary();
        summary2.setUserId("customer-1");
        summary2.setTotalAmount(BigDecimal.valueOf(150.00));

        when(summaryRepository.findByUserIdOrderByCreatedAtDesc("customer-1"))
                .thenReturn(Arrays.asList(summary1, summary2));

        BigDecimal totalSpending = summaryService.getTotalSpending("customer-1");

        assertEquals(BigDecimal.valueOf(250.00), totalSpending);
    }

    @Test
    void testGetTotalSpendingNoOrders() {
        when(summaryRepository.findByUserIdOrderByCreatedAtDesc("customer-1"))
                .thenReturn(Arrays.asList());

        assertEquals(BigDecimal.ZERO, summaryService.getTotalSpending("customer-1"));
    }

    @Test
    void testGetOrderCount() {
        when(summaryRepository.countByUserId("customer-1")).thenReturn(5L);

        assertEquals(5L, summaryService.getOrderCount("customer-1"));
        verify(summaryRepository, times(1)).countByUserId("customer-1");
    }

    @Test
    void testGetAverageOrderAmount() {
        Summary summary1 = new Summary();
        summary1.setTotalAmount(BigDecimal.valueOf(100.00));
        Summary summary2 = new Summary();
        summary2.setTotalAmount(BigDecimal.valueOf(200.00));

        when(summaryRepository.findByUserIdOrderByCreatedAtDesc("customer-1"))
                .thenReturn(Arrays.asList(summary1, summary2));

        BigDecimal averageAmount = summaryService.getAverageOrderAmount("customer-1");

        assertEquals(0, BigDecimal.valueOf(150.00).compareTo(averageAmount));
    }

    @Test
    void testGetAverageOrderAmountNoOrders() {
        when(summaryRepository.findByUserIdOrderByCreatedAtDesc("customer-1"))
                .thenReturn(Arrays.asList());

        assertEquals(BigDecimal.ZERO, summaryService.getAverageOrderAmount("customer-1"));
    }

    @Test
    void testGetFormattedReceiptScopedToCustomer() {
        when(summaryRepository.findByOrderIdAndUserId(1L, "customer-1")).thenReturn(Optional.of(testSummary));

        String receipt = summaryService.getFormattedReceipt("customer-1", 1L);

        assertTrue(receipt.contains("Order ID: 1"));
        assertTrue(receipt.contains("Total: $99.99"));
    }
}