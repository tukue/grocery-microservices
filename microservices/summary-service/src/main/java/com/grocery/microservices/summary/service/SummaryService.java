package com.grocery.microservices.summary.service;

import com.grocery.microservices.summary.exception.SummaryNotFoundException;
import com.grocery.microservices.summary.model.Summary;
import com.grocery.microservices.summary.port.SummaryQuery;
import com.grocery.microservices.summary.repository.SummaryRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SummaryService implements SummaryQuery {
    private final SummaryRepository summaryRepository;
    private final SummaryProcessor processor;

    public SummaryService(SummaryRepository summaryRepository) {
        this.summaryRepository = summaryRepository;
        this.processor = new SummaryProcessor();
    }

    @Override
    public List<Summary> getSummariesByCustomer(String customerId) {
        return summaryRepository.findByUserIdOrderByCreatedAtDesc(customerId);
    }

    @Override
    public Summary getSummaryByOrder(String customerId, Long orderId) {
        return summaryRepository.findByOrderIdAndUserId(orderId, customerId)
                .orElseThrow(() -> new SummaryNotFoundException(orderId));
    }

    @Override
    public BigDecimal getTotalSpending(String customerId) {
        List<Summary> summaries = summaryRepository.findByUserIdOrderByCreatedAtDesc(customerId);
        return processor.calculateTotalSpending(summaries);
    }

    @Override
    public long getOrderCount(String customerId) {
        return summaryRepository.countByUserId(customerId);
    }

    @Override
    public BigDecimal getAverageOrderAmount(String customerId) {
        List<Summary> summaries = summaryRepository.findByUserIdOrderByCreatedAtDesc(customerId);
        return processor.calculateAverageOrderAmount(summaries);
    }

    @Override
    public String getFormattedReceipt(String customerId, Long orderId) {
        Summary summary = getSummaryByOrder(customerId, orderId);
        return processor.formatReceipt(summary);
    }
}