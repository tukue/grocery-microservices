package com.grocery.microservices.ledger.service;

import com.grocery.microservices.ledger.exception.LedgerNotFoundException;
import com.grocery.microservices.ledger.model.Ledger;
import com.grocery.microservices.ledger.port.LedgerQuery;
import com.grocery.microservices.ledger.repository.LedgerRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class LedgerService implements LedgerQuery {
    private final LedgerRepository ledgerRepository;
    private final LedgerProcessor processor;

    public LedgerService(LedgerRepository ledgerRepository) {
        this.ledgerRepository = ledgerRepository;
        this.processor = new LedgerProcessor();
    }

    @Override
    public List<Ledger> getSummariesByCustomer(String customerId) {
        return ledgerRepository.findByUserIdOrderByCreatedAtDesc(customerId);
    }

    @Override
    public Ledger getSummaryByOrder(String customerId, Long orderId) {
        return ledgerRepository.findByOrderIdAndUserId(orderId, customerId)
                .orElseThrow(() -> new LedgerNotFoundException(orderId));
    }

    @Override
    public BigDecimal getTotalSpending(String customerId) {
        List<Ledger> ledgers = ledgerRepository.findByUserIdOrderByCreatedAtDesc(customerId);
        return processor.calculateTotalSpending(ledgers);
    }

    @Override
    public long getOrderCount(String customerId) {
        return ledgerRepository.countByUserId(customerId);
    }

    @Override
    public BigDecimal getAverageOrderAmount(String customerId) {
        List<Ledger> ledgers = ledgerRepository.findByUserIdOrderByCreatedAtDesc(customerId);
        return processor.calculateAverageOrderAmount(ledgers);
    }

    @Override
    public String getFormattedReceipt(String customerId, Long orderId) {
        Ledger ledger = getSummaryByOrder(customerId, orderId);
        return processor.formatReceipt(ledger);
    }
}
