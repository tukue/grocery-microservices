package com.example.summary.service;

import com.example.summary.model.Summary;
import com.example.summary.repository.SummaryRepository;
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
        testSummary.setUserId("user123");
        testSummary.setOrderId(1L);
        testSummary.setTotalAmount(BigDecimal.valueOf(99.99));
        testSummary.setItemCount(3);
        testSummary.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void testCreateSummary() {
        // Arrange
        Summary newSummary = new Summary();
        newSummary.setUserId("user123");
        newSummary.setOrderId(1L);
        newSummary.setTotalAmount(BigDecimal.valueOf(99.99));
        when(summaryRepository.save(any(Summary.class))).thenReturn(newSummary);

        // Act
        Summary result = summaryService.createSummary(newSummary);

        // Assert
        assertNotNull(result);
        assertEquals("user123", result.getUserId());
        assertEquals(1L, result.getOrderId());
        assertEquals(BigDecimal.valueOf(99.99), result.getTotalAmount());
        verify(summaryRepository, times(1)).save(any(Summary.class));
    }

    @Test
    void testGetSummaryById() {
        // Arrange
        when(summaryRepository.findById(1L)).thenReturn(Optional.of(testSummary));

        // Act
        Summary result = summaryService.getSummaryById(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("user123", result.getUserId());
        verify(summaryRepository, times(1)).findById(1L);
    }

    @Test
    void testGetSummaryByIdNotFound() {
        // Arrange
        when(summaryRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> summaryService.getSummaryById(999L));
        verify(summaryRepository, times(1)).findById(999L);
    }

    @Test
    void testGetSummariesByUserId() {
        // Arrange
        when(summaryRepository.findByUserId("user123")).thenReturn(Arrays.asList(testSummary));

        // Act
        List<Summary> results = summaryService.getSummariesByUserId("user123");

        // Assert
        assertNotNull(results);
        assertFalse(results.isEmpty());
        assertEquals(1, results.size());
        assertEquals("user123", results.get(0).getUserId());
        verify(summaryRepository, times(1)).findByUserId("user123");
    }

    @Test
    void testGetSummariesByUserIdNotFound() {
        // Arrange
        when(summaryRepository.findByUserId("nonexistent")).thenReturn(Arrays.asList());

        // Act
        List<Summary> results = summaryService.getSummariesByUserId("nonexistent");

        // Assert
        assertNotNull(results);
        assertTrue(results.isEmpty());
        verify(summaryRepository, times(1)).findByUserId("nonexistent");
    }

    @Test
    void testGetUserTotalSpending() {
        // Arrange
        Summary summary1 = new Summary();
        summary1.setUserId("user123");
        summary1.setTotalAmount(BigDecimal.valueOf(100.00));

        Summary summary2 = new Summary();
        summary2.setUserId("user123");
        summary2.setTotalAmount(BigDecimal.valueOf(150.00));

        when(summaryRepository.findByUserId("user123")).thenReturn(Arrays.asList(summary1, summary2));

        // Act
        BigDecimal totalSpending = summaryService.getUserTotalSpending("user123");

        // Assert
        assertEquals(BigDecimal.valueOf(250.00), totalSpending);
        verify(summaryRepository, times(1)).findByUserId("user123");
    }

    @Test
    void testGetUserTotalSpendingNoOrders() {
        // Arrange
        when(summaryRepository.findByUserId("user123")).thenReturn(Arrays.asList());

        // Act
        BigDecimal totalSpending = summaryService.getUserTotalSpending("user123");

        // Assert
        assertEquals(BigDecimal.ZERO, totalSpending);
        verify(summaryRepository, times(1)).findByUserId("user123");
    }

    @Test
    void testGetUserOrderCount() {
        // Arrange
        when(summaryRepository.countByUserId("user123")).thenReturn(5L);

        // Act
        long orderCount = summaryService.getUserOrderCount("user123");

        // Assert
        assertEquals(5L, orderCount);
        verify(summaryRepository, times(1)).countByUserId("user123");
    }

    @Test
    void testGetAverageOrderAmount() {
        // Arrange
        Summary summary1 = new Summary();
        summary1.setTotalAmount(BigDecimal.valueOf(100.00));
        Summary summary2 = new Summary();
        summary2.setTotalAmount(BigDecimal.valueOf(200.00));

        when(summaryRepository.findByUserId("user123")).thenReturn(Arrays.asList(summary1, summary2));

        // Act
        BigDecimal averageAmount = summaryService.getAverageOrderAmount("user123");

        // Assert
        assertEquals(BigDecimal.valueOf(150.00), averageAmount);
        verify(summaryRepository, times(1)).findByUserId("user123");
    }

    @Test
    void testGetAverageOrderAmountNoOrders() {
        // Arrange
        when(summaryRepository.findByUserId("user123")).thenReturn(Arrays.asList());

        // Act
        BigDecimal averageAmount = summaryService.getAverageOrderAmount("user123");

        // Assert
        assertEquals(BigDecimal.ZERO, averageAmount);
        verify(summaryRepository, times(1)).findByUserId("user123");
    }
} 