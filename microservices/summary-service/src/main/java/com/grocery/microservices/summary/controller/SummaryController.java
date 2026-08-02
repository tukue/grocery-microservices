package com.grocery.microservices.summary.controller;

import com.grocery.microservices.summary.dto.SummaryDTO;
import com.grocery.microservices.summary.model.Summary;
import com.grocery.microservices.summary.service.SummaryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/summaries")
public class SummaryController {

    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @PostMapping
    public ResponseEntity<SummaryDTO> createSummary(@Valid @RequestBody SummaryDTO summaryDto) {
        Summary summary = convertToEntity(summaryDto);
        Summary createdSummary = summaryService.createSummary(summary);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(createdSummary));
    }

    @GetMapping("/{id}")
    public SummaryDTO getSummary(@PathVariable Long id) {
        Summary summary = summaryService.getSummary(id);
        return convertToDto(summary);
    }

    @GetMapping("/{id}/receipt")
    public String getReceipt(@PathVariable Long id) {
        return summaryService.getFormattedReceipt(id);
    }

    private SummaryDTO convertToDto(Summary summary) {
        SummaryDTO summaryDto = new SummaryDTO();
        summaryDto.setId(summary.getId());
        summaryDto.setOrderId(summary.getOrderId());
        if (summary.getTotalAmount() != null) {
            summaryDto.setTotal(summary.getTotalAmount().doubleValue());
        }
        if (summary.getDetails() != null && !summary.getDetails().isBlank()) {
            summaryDto.setItems(Arrays.asList(summary.getDetails().split(", ")));
        }
        return summaryDto;
    }

    private Summary convertToEntity(SummaryDTO summaryDto) {
        Summary summary = new Summary();
        summary.setId(summaryDto.getId());
        summary.setOrderId(summaryDto.getOrderId());
        summary.setTotalAmount(BigDecimal.valueOf(summaryDto.getTotal()));
        List<String> items = summaryDto.getItems();
        if (items != null) {
            summary.setItemCount(items.size());
            summary.setDetails(String.join(", ", items));
        }
        summary.setCreatedAt(LocalDateTime.now());
        return summary;
    }
}
