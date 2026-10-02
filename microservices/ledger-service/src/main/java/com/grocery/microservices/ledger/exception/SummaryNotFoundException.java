package com.grocery.microservices.ledger.exception;

public class LedgerNotFoundException extends RuntimeException {
    public LedgerNotFoundException(Long id) {
        super("Summary not found with id: " + id);
    }
}
