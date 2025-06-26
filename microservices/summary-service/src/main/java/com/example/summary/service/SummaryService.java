package com.example.summary.service;

import com.example.summary.model.Summary;
import com.example.summary.repository.SummaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

    public void setSummaryRepository(SummaryRepository summaryRepository) {
        this.summaryRepository = summaryRepository;
    }
} 