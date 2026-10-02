package com.grocery.microservices.ledger.service;

import com.grocery.microservices.ledger.exception.LedgerNotFoundException;
import com.grocery.microservices.ledger.model.Summary;
import com.grocery.microservices.ledger.port.SummaryQuery;
import com.grocery.microservices.ledger.repository.LedgerRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class LedgerService implements SummaryQuery {
    private final LedgerRepository summaryRepository;
    private final LedgerProcessor processor;

    public LedgerService(LedgerRepository summaryRepository) {
        this.summaryRepository = summaryRepository;
        this.processor = new LedgerProcessor();
    }

    @Override
    public List<Summary> getSummariesByCustomer(String customerId) {
        return summaryRepository.findByUserIdOrderByCreatedAtDesc(customerId);
    }

    @Override
    public Summary getSummaryByOrder(String customerId, Long orderId) {
        return summaryRepository.findByOrderIdAndUserId(orderId, customerId)
                .orElseThrow(() -> new LedgerNotFoundException(orderId));
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
