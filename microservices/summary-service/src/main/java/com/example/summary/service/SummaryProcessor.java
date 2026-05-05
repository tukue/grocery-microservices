package com.example.summary.service;

import com.example.summary.model.Summary;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Pure domain logic for summary calculations.
 * Independent of Spring and Database.
 */
public class SummaryProcessor {

    public BigDecimal calculateTotalSpending(List<Summary> summaries) {
        return summaries.stream()
                .map(s -> s.getTotalAmount() != null ? s.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal calculateAverageOrderAmount(List<Summary> summaries) {
        if (summaries == null || summaries.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = calculateTotalSpending(summaries);
        return total.divide(BigDecimal.valueOf(summaries.size()), 2, RoundingMode.HALF_UP);
    }

    public String formatReceipt(Summary summary) {
        StringBuilder sb = new StringBuilder();
        sb.append("--- RECEIPT ---\n");
        sb.append("Order ID: ").append(summary.getOrderId()).append("\n");
        sb.append("Date: ").append(summary.getCreatedAt()).append("\n");
        sb.append("Items: ").append(summary.getItemCount()).append("\n");
        sb.append("Total: $").append(summary.getTotalAmount()).append("\n");
        if (summary.getDetails() != null) {
            sb.append("Details: ").append(summary.getDetails()).append("\n");
        }
        sb.append("---------------\n");
        return sb.toString();
    }
}
