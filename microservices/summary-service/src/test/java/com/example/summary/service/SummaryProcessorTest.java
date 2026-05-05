package com.example.summary.service;

import com.example.summary.model.Summary;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SummaryProcessorTest {

    private final SummaryProcessor processor = new SummaryProcessor();

    @Test
    void shouldCalculateTotalSpending() {
        Summary s1 = new Summary();
        s1.setTotalAmount(new BigDecimal("10.50"));
        Summary s2 = new Summary();
        s2.setTotalAmount(new BigDecimal("20.00"));
        
        List<Summary> summaries = Arrays.asList(s1, s2);
        
        assertEquals(new BigDecimal("30.50"), processor.calculateTotalSpending(summaries));
    }

    @Test
    void shouldCalculateAverageOrderAmount() {
        Summary s1 = new Summary();
        s1.setTotalAmount(new BigDecimal("10.00"));
        Summary s2 = new Summary();
        s2.setTotalAmount(new BigDecimal("20.00"));
        
        List<Summary> summaries = Arrays.asList(s1, s2);
        
        assertEquals(new BigDecimal("15.00"), processor.calculateAverageOrderAmount(summaries));
    }

    @Test
    void shouldFormatReceipt() {
        Summary summary = new Summary();
        summary.setOrderId(123L);
        summary.setCreatedAt(LocalDateTime.of(2023, 10, 27, 10, 0));
        summary.setItemCount(3);
        summary.setTotalAmount(new BigDecimal("45.67"));
        summary.setDetails("Apple, Banana, Carrot");
        
        String receipt = processor.formatReceipt(summary);
        
        assertTrue(receipt.contains("Order ID: 123"));
        assertTrue(receipt.contains("Items: 3"));
        assertTrue(receipt.contains("Total: $45.67"));
        assertTrue(receipt.contains("Details: Apple, Banana, Carrot"));
    }
}
