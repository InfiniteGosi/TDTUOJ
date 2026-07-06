package com.oj.TDTUOJ.common.exceptions;

/**
 * Thrown when a requested entity does not exist. Mapped to HTTP 404 by {@code GlobalExceptionHandler}.
 */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
