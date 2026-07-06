package com.oj.TDTUOJ.common.exceptions;

/**
 * Thrown when an authenticated user attempts an action they are not permitted to perform.
 * Mapped to HTTP 401 by {@code GlobalExceptionHandler}.
 */
public class UnauthorizedAccessException extends RuntimeException {
    public UnauthorizedAccessException(String message){
        super(message);
    }
}
