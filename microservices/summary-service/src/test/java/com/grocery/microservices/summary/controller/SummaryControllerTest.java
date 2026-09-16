package com.grocery.microservices.summary.controller;

import com.grocery.microservices.summary.config.TestJwtSupport;
import com.grocery.microservices.summary.config.TestSecurityConfig;
import com.grocery.microservices.summary.exception.SummaryNotFoundException;
import com.grocery.microservices.summary.model.Summary;
import com.grocery.microservices.summary.service.SummaryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@WebMvcTest(SummaryController.class)
@Import(TestSecurityConfig.class)
public class SummaryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SummaryService summaryService;

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    public void rejectsRequestWithoutToken() throws Exception {
        mockMvc.perform(get("/api/customer/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void rejectsRequestWhenTokenIsMissingScope() throws Exception {
        mockMvc.perform(get("/api/customer/summary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.tokenWithScopes("customer-1", "cart:read"))))
                .andExpect(status().isForbidden());
    }

    @Test
    public void returnsAggregatedSummaryForAuthenticatedCustomer() throws Exception {
        Summary summary = new Summary();
        summary.setId(1L);
        summary.setOrderId(42L);
        summary.setUserId("customer-1");
        summary.setItemCount(2);
        summary.setDetails("Apple, Banana");
        summary.setTotalAmount(new BigDecimal("12.5"));
        summary.setCreatedAt(LocalDateTime.now());

        when(summaryService.getOrderCount("customer-1")).thenReturn(1L);
        when(summaryService.getTotalSpending("customer-1")).thenReturn(new BigDecimal("12.5"));
        when(summaryService.getAverageOrderAmount("customer-1")).thenReturn(new BigDecimal("12.5"));
        when(summaryService.getSummariesByCustomer("customer-1")).thenReturn(java.util.List.of(summary));

        mockMvc.perform(get("/api/customer/summary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.validToken("customer-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerId").value("customer-1"))
                .andExpect(jsonPath("$.orderCount").value(1))
                .andExpect(jsonPath("$.totalSpending").value(12.5))
                .andExpect(jsonPath("$.averageOrderAmount").value(12.5))
                .andExpect(jsonPath("$.recentOrders[0].orderId").value(42L))
                .andExpect(jsonPath("$.recentOrders[0].items[0]").value("Apple"));
    }

    @Test
    public void returnsEmptySummaryWhenCustomerHasNoOrders() throws Exception {
        when(summaryService.getOrderCount("customer-1")).thenReturn(0L);
        when(summaryService.getTotalSpending("customer-1")).thenReturn(BigDecimal.ZERO);
        when(summaryService.getAverageOrderAmount("customer-1")).thenReturn(BigDecimal.ZERO);
        when(summaryService.getSummariesByCustomer("customer-1")).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/customer/summary")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.validToken("customer-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderCount").value(0))
                .andExpect(jsonPath("$.recentOrders").isEmpty());
    }

    @Test
    public void returnsNotFoundWhenOtherCustomersOrderReceiptIsRequested() throws Exception {
        when(summaryService.getFormattedReceipt("customer-2", 99L))
                .thenThrow(new SummaryNotFoundException(99L));

        mockMvc.perform(get("/api/customer/summary/orders/99/receipt")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.validToken("customer-2"))))
                .andExpect(status().isNotFound());
    }

    @Test
    public void returnsReceiptForOwnedOrder() throws Exception {
        when(summaryService.getFormattedReceipt("customer-1", 42L))
                .thenReturn("--- RECEIPT ---\nOrder ID: 42\n---------------\n");

        mockMvc.perform(get("/api/customer/summary/orders/42/receipt")
                        .header(HttpHeaders.AUTHORIZATION, bearer(TestJwtSupport.validToken("customer-1"))))
                .andExpect(status().isOk())
                .andExpect(content().string("--- RECEIPT ---\nOrder ID: 42\n---------------\n"));
    }
}