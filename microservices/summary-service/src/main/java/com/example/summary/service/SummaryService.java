package com.example.summary.service;

import com.example.summary.model.Summary;
import com.example.summary.repository.SummaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

@Service
public class SummaryService {
    @Autowired
    private SummaryRepository summaryRepository;

    public Summary createSummary(Summary summary) {
        return summaryRepository.save(summary);
    }

    public Summary getSummary(Long id) {
        return summaryRepository.findById(id).orElse(null);
    }

    public Summary getSummaryById(Long id) {
        return summaryRepository.findById(id).orElseThrow(() -> new RuntimeException("Summary not found"));
    }

    public List<Summary> getSummariesByUserId(String userId) {
        return summaryRepository.findByUserId(userId);
    }

    public BigDecimal getUserTotalSpending(String userId) {
        List<Summary> summaries = summaryRepository.findByUserId(userId);
        return summaries.stream()
                .map(s -> s.getTotalAmount() != null ? s.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public long getUserOrderCount(String userId) {
        return summaryRepository.countByUserId(userId);
    }

    public BigDecimal getAverageOrderAmount(String userId) {
        List<Summary> summaries = summaryRepository.findByUserId(userId);
        if (summaries.isEmpty()) return BigDecimal.ZERO;
        BigDecimal total = summaries.stream()
                .map(s -> s.getTotalAmount() != null ? s.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(summaries.size()), BigDecimal.ROUND_HALF_UP);
    }

    public void setSummaryRepository(SummaryRepository summaryRepository) {
        this.summaryRepository = summaryRepository;
    }
} 