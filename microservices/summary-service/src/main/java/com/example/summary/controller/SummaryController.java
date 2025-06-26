package com.example.summary.controller;

import com.example.summary.dto.SummaryDTO;
import com.example.summary.model.Summary;
import com.example.summary.service.SummaryService;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/summaries")
public class SummaryController {

    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @PostMapping
    public SummaryDTO createSummary(@Valid @RequestBody SummaryDTO summaryDto) {
        Summary summary = convertToEntity(summaryDto);
        Summary createdSummary = summaryService.createSummary(summary);
        return convertToDto(createdSummary);
    }

    @GetMapping("/{id}")
    public SummaryDTO getSummary(@PathVariable Long id) {
        Summary summary = summaryService.getSummary(id);
        return convertToDto(summary);
    }

    private SummaryDTO convertToDto(Summary summary) {
        SummaryDTO summaryDto = new SummaryDTO();
        BeanUtils.copyProperties(summary, summaryDto);
        return summaryDto;
    }

    private Summary convertToEntity(SummaryDTO summaryDto) {
        Summary summary = new Summary();
        BeanUtils.copyProperties(summaryDto, summary);
        return summary;
    }
} 