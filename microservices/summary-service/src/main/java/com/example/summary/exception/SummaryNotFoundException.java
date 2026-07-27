package com.example.summary.exception;

public class SummaryNotFoundException extends RuntimeException {
    public SummaryNotFoundException(Long id) {
        super("Summary not found with id: " + id);
    }
}
