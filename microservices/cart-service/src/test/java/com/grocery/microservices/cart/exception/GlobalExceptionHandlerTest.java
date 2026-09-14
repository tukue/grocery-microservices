package com.grocery.microservices.cart.exception;

import com.grocery.microservices.cart.dto.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    @Test
    void optimisticLockingFailureReturnsConflict() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("PATCH", "/api/customer/cart/1/items/1");

        ResponseEntity<ErrorResponse> response = handler.handleOptimisticLockingFailure(
                new ObjectOptimisticLockingFailureException("Cart", 1L), request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Cart was modified by another request. Reload the cart and retry.",
                response.getBody().getMessage());
    }
}
