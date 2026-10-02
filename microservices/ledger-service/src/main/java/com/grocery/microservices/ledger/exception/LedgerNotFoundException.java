package com.grocery.microservices.ledger.exception;

public class LedgerNotFoundException extends RuntimeException {
    public LedgerNotFoundException(Long id) {
        super("Ledger not found with id: " + id);
    }
}
