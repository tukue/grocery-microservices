package com.example.receipt.controller;

import com.example.receipt.dto.ReceiptDTO;
import com.example.receipt.model.Receipt;
import com.example.receipt.service.ReceiptService;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/receipts")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @PostMapping
    public ReceiptDTO createReceipt(@RequestBody ReceiptDTO receiptDto) {
        Receipt receipt = convertToEntity(receiptDto);
        Receipt createdReceipt = receiptService.createReceipt(receipt);
        return convertToDto(createdReceipt);
    }

    @GetMapping("/{id}")
    public ReceiptDTO getReceipt(@PathVariable Long id) {
        Receipt receipt = receiptService.getReceipt(id);
        return convertToDto(receipt);
    }

    private ReceiptDTO convertToDto(Receipt receipt) {
        ReceiptDTO receiptDto = new ReceiptDTO();
        BeanUtils.copyProperties(receipt, receiptDto);
        return receiptDto;
    }

    private Receipt convertToEntity(ReceiptDTO receiptDto) {
        Receipt receipt = new Receipt();
        BeanUtils.copyProperties(receiptDto, receipt);
        return receipt;
    }
} 