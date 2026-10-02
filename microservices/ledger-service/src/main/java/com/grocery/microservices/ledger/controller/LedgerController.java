package com.grocery.microservices.ledger.controller;

import com.grocery.microservices.ledger.config.AuthenticatedCustomer;
import com.grocery.microservices.ledger.dto.CustomerLedgerDTO;
import com.grocery.microservices.ledger.dto.LedgerDTO;
import com.grocery.microservices.ledger.model.Ledger;
import com.grocery.microservices.ledger.port.LedgerQuery;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/customer/ledger")
public class LedgerController {

    private final LedgerQuery ledgerQuery;

    public LedgerController(LedgerQuery ledgerQuery) {
        this.ledgerQuery = ledgerQuery;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_ledger:read')")
    public CustomerLedgerDTO getMyLedger(@AuthenticationPrincipal AuthenticatedCustomer customer) {
        String customerId = customer.customerId();
        CustomerLedgerDTO dto = new CustomerLedgerDTO();
        dto.setCustomerId(customerId);
        dto.setOrderCount(ledgerQuery.getOrderCount(customerId));
        dto.setTotalSpending(ledgerQuery.getTotalSpending(customerId));
        dto.setAverageOrderAmount(ledgerQuery.getAverageOrderAmount(customerId));
        dto.setRecentOrders(ledgerQuery.getSummariesByCustomer(customerId).stream()
                .map(this::convertToDto)
                .toList());
        return dto;
    }

    @GetMapping("/orders/{orderId}/receipt")
    @PreAuthorize("hasAuthority('SCOPE_ledger:read')")
    public String getReceipt(@PathVariable Long orderId,
                             @AuthenticationPrincipal AuthenticatedCustomer customer) {
        return ledgerQuery.getFormattedReceipt(customer.customerId(), orderId);
    }

    private LedgerDTO convertToDto(Ledger ledger) {
        LedgerDTO dto = new LedgerDTO();
        dto.setId(ledger.getId());
        dto.setOrderId(ledger.getOrderId());
        if (ledger.getTotalAmount() != null) {
            dto.setTotal(ledger.getTotalAmount().doubleValue());
        }
        if (ledger.getDetails() != null && !ledger.getDetails().isBlank()) {
            dto.setItems(Arrays.asList(ledger.getDetails().split(", ")));
        }
        return dto;
    }
}
