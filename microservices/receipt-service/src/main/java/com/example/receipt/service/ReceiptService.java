package com.example.receipt.service;

import com.example.receipt.model.Receipt;
import com.example.receipt.repository.ReceiptRepository;
import org.springframework.stereotype.Service;

@Service
public class ReceiptService {
    private final ReceiptRepository repo;
    public ReceiptService(ReceiptRepository repo) { this.repo = repo; }

    public Receipt createReceipt(Receipt receipt) { return repo.save(receipt); }
    public Receipt getReceipt(Long id) { return repo.findById(id).orElseThrow(); }
} 