package com.oj.TDTUOJ.organization.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * API view of a member row. Also reused for "search non-members" results, in which
 * case {@code id}/{@code joinedAt}/{@code role} are left null (the user isn't a member yet).
 */
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
