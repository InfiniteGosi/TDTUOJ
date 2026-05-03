package com.oj.TDTUOJ.problemFavorite.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

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
