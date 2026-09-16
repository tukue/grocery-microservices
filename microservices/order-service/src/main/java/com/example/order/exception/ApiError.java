package com.example.order.exception;

import java.util.Map;

public record ApiError(String code, String message, Map<String, String> errors) {
}
