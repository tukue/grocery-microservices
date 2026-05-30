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

    private final SummaryProcessor processor = new SummaryProcessor();

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
        return processor.calculateTotalSpending(summaries);
    }

    public long getUserOrderCount(String userId) {
        return summaryRepository.countByUserId(userId);
    }

    public BigDecimal getAverageOrderAmount(String userId) {
        List<Summary> summaries = summaryRepository.findByUserId(userId);
        return processor.calculateAverageOrderAmount(summaries);
    }

    public String getFormattedReceipt(Long id) {
        Summary summary = getSummaryById(id);
        return processor.formatReceipt(summary);
    }

    public void setSummaryRepository(SummaryRepository summaryRepository) {
        this.summaryRepository = summaryRepository;
    }
} 