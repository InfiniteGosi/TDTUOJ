package com.oj.TDTUOJ.organization.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * API view of an {@link com.oj.TDTUOJ.organization.entity.Organization}. Two fields
 * are caller-relative: {@code code} is only set for privileged callers (OWNER/ADMIN/
 * platform admin), and {@code myRole} reflects the current caller's membership.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrganizationDTO {

    private Long id;

    private String name;

    /** Only visible to org OWNER / ADMIN */
    private String code;

    private String about;

    private String slug;

    private Boolean isPublic;

    // Creator info
    private Long creatorId;
    private String creatorUsername;

    // Summary
    private Integer totalMembers;

    /** The calling user's role in this org (null if not a member) */
    private String myRole;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
