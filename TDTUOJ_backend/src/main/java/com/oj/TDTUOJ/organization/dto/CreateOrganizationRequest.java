package com.oj.TDTUOJ.organization.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateOrganizationRequest {

    @NotBlank(message = "Organization name is required")
    private String name;

    private String about;

    /** Optional custom join code. Auto-generated if not provided. */
    private String code;

    private Boolean isPublic;
}
