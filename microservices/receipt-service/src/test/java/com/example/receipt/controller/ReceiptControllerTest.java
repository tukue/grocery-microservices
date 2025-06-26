package com.example.receipt.controller;

import com.example.receipt.dto.ReceiptDTO;
import com.example.receipt.model.Receipt;
import com.example.receipt.service.ReceiptService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReceiptController.class)
public class ReceiptControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReceiptService receiptService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testCreateReceipt() throws Exception {
        ReceiptDTO receiptDTO = new ReceiptDTO();
        // Set properties for receiptDTO if needed

        Receipt savedReceipt = new Receipt();
        savedReceipt.setId(1L);
        // Set other properties for savedReceipt

        when(receiptService.createReceipt(any(Receipt.class))).thenReturn(savedReceipt);

        mockMvc.perform(post("/receipts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(receiptDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }
} 