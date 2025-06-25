package com.example.receipt.service;

import com.example.receipt.model.Receipt;
import com.example.receipt.repository.ReceiptRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.junit.jupiter.api.Assertions.*;

class ReceiptServiceTest {
    @Test
    void testCreateReceipt() {
        ReceiptRepository repo = Mockito.mock(ReceiptRepository.class);
        Mockito.when(repo.save(Mockito.any(Receipt.class))).thenReturn(new Receipt());
        ReceiptService service = new ReceiptService(repo);
        assertNotNull(service.createReceipt(new Receipt()));
    }
} 