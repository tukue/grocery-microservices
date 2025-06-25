package com.example.receipt.controller;

import com.example.receipt.model.Receipt;
import com.example.receipt.service.ReceiptService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/receipts")
public class ReceiptController {
    private final ReceiptService service;
    public ReceiptController(ReceiptService service) { this.service = service; }

    @PostMapping
    public Receipt createReceipt(@RequestBody Receipt receipt) { return service.createReceipt(receipt); }

    @GetMapping("/{id}")
    public Receipt getReceipt(@PathVariable Long id) { return service.getReceipt(id); }
} 