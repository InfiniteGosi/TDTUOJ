package com.oj.TDTUOJ.problemFavorite.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Result of a favorite toggle. The {@code isFavorited} flag reports the state <i>after</i> the
 * operation (true = just added, false = just removed) so the client can update its UI directly.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProblemFavoriteDTO {
    private Long id;

    private Long userId;

    private Long problemId;

    private LocalDateTime createdAt;

    private Boolean isFavorited;
}
