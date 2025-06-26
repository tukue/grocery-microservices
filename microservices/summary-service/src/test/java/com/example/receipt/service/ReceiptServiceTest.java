package com.example.summary.service;

import com.example.summary.model.Summary;
import com.example.summary.repository.SummaryRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.junit.jupiter.api.Assertions.*;

class SummaryServiceTest {
    @Test
    void testCreateSummary() {
        SummaryRepository repo = Mockito.mock(SummaryRepository.class);
        Mockito.when(repo.save(Mockito.any(Summary.class))).thenReturn(new Summary());
        SummaryService service = new SummaryService();
        service.setSummaryRepository(repo);
        assertNotNull(service.createSummary(new Summary()));
    }
} 