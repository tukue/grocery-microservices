package com.grocery.microservices.ledger.port;

import com.grocery.microservices.ledger.model.Ledger;

import java.math.BigDecimal;
import java.util.List;

/**
 * Read-side port for customer summary queries. Always scoped to a single
 * customer identifier taken from the authenticated JWT {@code sub} claim.
 */
public interface LedgerQuery {

    List<Ledger> getSummariesByCustomer(String customerId);

    Ledger getSummaryByOrder(String customerId, Long orderId);

    BigDecimal getTotalSpending(String customerId);

    long getOrderCount(String customerId);

    BigDecimal getAverageOrderAmount(String customerId);

    String getFormattedReceipt(String customerId, Long orderId);
}
