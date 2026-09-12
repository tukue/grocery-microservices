package com.grocery.microservices.product.controller;

import com.grocery.microservices.product.config.TestJwtSupport;
import com.grocery.microservices.product.config.TestSecurityConfig;
import com.grocery.microservices.product.dto.StockReservationDTO;
import com.grocery.microservices.product.exception.InsufficientStockException;
import com.grocery.microservices.product.model.StockReservation;
import com.grocery.microservices.product.service.StockReservationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@WebMvcTest(StockReservationController.class)
@Import(TestSecurityConfig.class)
class StockReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StockReservationService stockReservationService;

    private static String bearer() {
        return "Bearer " + TestJwtSupport.validToken("customer-1");
    }

    @Test
    void reserveReturnsCreatedReservation() throws Exception {
        StockReservation reservation = new StockReservation("checkout:key:1", 1L, 2);
        when(stockReservationService.reserve(eq(1L), eq(2), eq("checkout:key:1")))
                .thenReturn(reservation);

        mockMvc.perform(post("/products/1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("reservationKey", "checkout:key:1", "quantity", 2))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reservationKey").value("checkout:key:1"))
                .andExpect(jsonPath("$.productId").value(1))
                .andExpect(jsonPath("$.quantity").value(2))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void reserveRejectsInvalidBodyWithoutCallingService() throws Exception {
        mockMvc.perform(post("/products/1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reservationKey\":\"\",\"quantity\":0}"))
                .andExpect(status().isBadRequest());

        verify(stockReservationService, org.mockito.Mockito.never())
                .reserve(any(), anyInt(), anyString());
    }

    @Test
    void reserveRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/products/1/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reservationKey\":\"k\",\"quantity\":1}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reserveMapsInsufficientStockToConflict() throws Exception {
        when(stockReservationService.reserve(any(), anyInt(), anyString()))
                .thenThrow(new InsufficientStockException(1L, 5, 2));

        mockMvc.perform(post("/products/1/reservations")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reservationKey\":\"k\",\"quantity\":5}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("insufficient stock")));
    }

    @Test
    void releaseReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/products/reservations/checkout-key")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isNoContent());

        verify(stockReservationService).release("checkout-key");
    }

    @Test
    void releaseRequiresAuthentication() throws Exception {
        mockMvc.perform(delete("/products/reservations/checkout-key"))
                .andExpect(status().isUnauthorized());
    }
}