package com.oj.TDTUOJ.organization.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrganizationMemberDTO {

    private Long id;

    private Long userId;
    private String username;
    private String name;
    private String profileUrl;

    private String role;

    private LocalDateTime joinedAt;
}
