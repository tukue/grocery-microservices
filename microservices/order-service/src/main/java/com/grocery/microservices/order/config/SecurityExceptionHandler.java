package com.grocery.microservices.order.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grocery.microservices.order.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

@Component
public class SecurityExceptionHandler implements AuthenticationEntryPoint, AccessDeniedHandler {
    private static final Logger log = LoggerFactory.getLogger(SecurityExceptionHandler.class);
    private final ObjectMapper objectMapper;

    public SecurityExceptionHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        log.warn("EVENT=AUTHENTICATION_FAILED METHOD={} PATH={} CLIENT_IP={} REASON={}",
                request.getMethod(), request.getRequestURI(), request.getRemoteAddr(), authException.getClass().getSimpleName());
        writeErrorResponse(request, response, HttpStatus.UNAUTHORIZED, "Authentication required");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws IOException {
        log.warn("EVENT=AUTHORIZATION_DENIED METHOD={} PATH={} CLIENT_IP={} REASON={}",
                request.getMethod(), request.getRequestURI(), request.getRemoteAddr(), accessDeniedException.getClass().getSimpleName());
        writeErrorResponse(request, response, HttpStatus.FORBIDDEN, "Access denied");
    }

    private void writeErrorResponse(HttpServletRequest request, HttpServletResponse response, HttpStatus status,
                                    String message) throws IOException {
        ErrorResponse error = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI()
        );
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), error);
    }
}
