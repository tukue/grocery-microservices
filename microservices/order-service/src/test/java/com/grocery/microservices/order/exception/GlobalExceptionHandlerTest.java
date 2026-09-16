package com.grocery.microservices.order.exception;

import com.grocery.microservices.order.dto.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.converter.HttpMessageNotReadableException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    @Test
    void optimisticLockingFailureReturnsConflict() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("PATCH", "/api/customer/orders/1/status");

        ResponseEntity<ErrorResponse> response = handler.handleOptimisticLockingFailure(
                new ObjectOptimisticLockingFailureException("Order", 1L), request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Order was modified by another request. Reload the order and retry.",
                response.getBody().getMessage());
    }

    @Test
    void unreadableRequestReturnsBadRequest() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/customer/orders");

        ResponseEntity<ErrorResponse> response = handler.handleUnreadableRequest(
                new HttpMessageNotReadableException("Malformed JSON"), request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Malformed request body", response.getBody().getMessage());
    }
}
