package com.grocery.microservices.summary.controller;

import com.grocery.microservices.summary.config.AuthenticatedCustomer;
import com.grocery.microservices.summary.dto.CustomerSummaryDTO;
import com.grocery.microservices.summary.dto.SummaryDTO;
import com.grocery.microservices.summary.model.Summary;
import com.grocery.microservices.summary.port.SummaryQuery;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/customer")
public class SummaryController {

    private final SummaryQuery summaryQuery;

    public SummaryController(SummaryQuery summaryQuery) {
        this.summaryQuery = summaryQuery;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('SCOPE_summary:read')")
    public CustomerSummaryDTO getMySummary(@AuthenticationPrincipal AuthenticatedCustomer customer) {
        String customerId = customer.customerId();
        CustomerSummaryDTO dto = new CustomerSummaryDTO();
        dto.setCustomerId(customerId);
        dto.setOrderCount(summaryQuery.getOrderCount(customerId));
        dto.setTotalSpending(summaryQuery.getTotalSpending(customerId));
        dto.setAverageOrderAmount(summaryQuery.getAverageOrderAmount(customerId));
        dto.setRecentOrders(summaryQuery.getSummariesByCustomer(customerId).stream()
                .map(this::convertToDto)
                .toList());
        return dto;
    }

    @GetMapping("/summary/orders/{orderId}/receipt")
    @PreAuthorize("hasAuthority('SCOPE_summary:read')")
    public String getReceipt(@PathVariable Long orderId,
                             @AuthenticationPrincipal AuthenticatedCustomer customer) {
        return summaryQuery.getFormattedReceipt(customer.customerId(), orderId);
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
}