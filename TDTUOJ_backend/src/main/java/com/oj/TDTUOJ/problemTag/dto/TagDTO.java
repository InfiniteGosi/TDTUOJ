package com.oj.TDTUOJ.problemTag.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.util.Set;

/** Transport object for {@link com.oj.TDTUOJ.problemTag.entity.Tag} create/update/read operations. */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class TagDTO {
    private Long id;

    private String name;

    private Boolean isActive;
}
