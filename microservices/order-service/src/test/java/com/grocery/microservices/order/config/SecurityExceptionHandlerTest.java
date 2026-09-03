package com.grocery.microservices.order.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SecurityExceptionHandlerTest {
    private SecurityExceptionHandler handler;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        handler = new SecurityExceptionHandler(objectMapper);
    }

    @Test
    void writesJsonUnauthorizedResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/orders/1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.commence(request, response, new InsufficientAuthenticationException("missing"));

        JsonNode body = objectMapper.readTree(response.getContentAsString());
        assertEquals(401, response.getStatus());
        assertEquals("application/json", response.getContentType());
        assertEquals("Authentication required", body.get("message").asText());
        assertEquals("/orders/1", body.get("path").asText());
    }

    @Test
    void writesJsonForbiddenResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("PATCH", "/orders/1/status");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(request, response, new AccessDeniedException("denied"));

        JsonNode body = objectMapper.readTree(response.getContentAsString());
        assertEquals(403, response.getStatus());
        assertEquals("application/json", response.getContentType());
        assertEquals("Access denied", body.get("message").asText());
        assertEquals("/orders/1/status", body.get("path").asText());
    }
}
