package com.oj.TDTUOJ.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.io.Serializable;
import java.util.Map;

/**
 * Uniform envelope wrapping every REST response so clients get a consistent shape regardless
 * of endpoint. {@code NON_NULL} inclusion keeps payloads lean by omitting unset fields
 * (e.g. {@code data} on an error, or {@code meta} when there is no pagination).
 *
 * @param <T> type of the {@code data} payload
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Response<T> {
    private int statusCode; // e.g "200", "404"
    private String message; // Additional information about the response
    private T data; // The actual data payload
    private Map<String, Serializable> meta;
}
