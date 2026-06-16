package com.oj.TDTUOJ.visualizer.service.tracer;

/** Thrown when user source cannot be instrumented (parse failure etc.). */
public class TracerException extends RuntimeException {
    public TracerException(String message) {
        super(message);
    }

    public TracerException(String message, Throwable cause) {
        super(message, cause);
    }
}
