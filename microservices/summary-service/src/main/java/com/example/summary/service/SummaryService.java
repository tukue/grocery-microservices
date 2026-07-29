package com.example.summary.service;

import com.example.summary.exception.SummaryNotFoundException;
import com.example.summary.model.Summary;
import com.example.summary.repository.SummaryRepository;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

@Service
public class SummaryService {
    private final SummaryRepository summaryRepository;
    private final SummaryProcessor processor;

    public SummaryService(SummaryRepository summaryRepository) {
        this.summaryRepository = summaryRepository;
        this.processor = new SummaryProcessor();
    }

    public Summary createSummary(Summary summary) {
        return summaryRepository.save(summary);
    }

    public Summary getSummary(Long id) {
        return getSummaryById(id);
    }

    public Summary getSummaryById(Long id) {
        return summaryRepository.findById(id).orElseThrow(() -> new SummaryNotFoundException(id));
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
}
