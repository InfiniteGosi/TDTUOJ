package com.oj.TDTUOJ.common.exceptions;

/**
 * Thrown for invalid client input. Mapped to HTTP 400 by {@code GlobalExceptionHandler}.
 * Unchecked (extends RuntimeException) so it can be thrown from service code without try/catch and
 * still trigger a JPA transaction rollback.
 */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
