package com.grocery.microservices.summary.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Read-only aggregate view of a single customer's order summary.
 */
public class CustomerSummaryDTO {
    private String customerId;
    private long orderCount;
    private BigDecimal totalSpending;
    private BigDecimal averageOrderAmount;
    private List<SummaryDTO> recentOrders;

    public String getCustomerId() { return customerId; }

    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public long getOrderCount() { return orderCount; }

    public void setOrderCount(long orderCount) { this.orderCount = orderCount; }

    public BigDecimal getTotalSpending() { return totalSpending; }

    public void setTotalSpending(BigDecimal totalSpending) { this.totalSpending = totalSpending; }

    public BigDecimal getAverageOrderAmount() { return averageOrderAmount; }

    public void setAverageOrderAmount(BigDecimal averageOrderAmount) { this.averageOrderAmount = averageOrderAmount; }

    public List<SummaryDTO> getRecentOrders() { return recentOrders; }

    public void setRecentOrders(List<SummaryDTO> recentOrders) { this.recentOrders = recentOrders; }
}