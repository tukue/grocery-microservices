package com.grocery.microservices.order.exception;

import com.grocery.microservices.order.dto.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

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
}
