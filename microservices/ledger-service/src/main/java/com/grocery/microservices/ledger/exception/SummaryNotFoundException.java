package com.grocery.microservices.ledger.exception;

public class SummaryNotFoundException extends RuntimeException {
    public SummaryNotFoundException(Long id) {
        super("Summary not found with id: " + id);
    }
}
