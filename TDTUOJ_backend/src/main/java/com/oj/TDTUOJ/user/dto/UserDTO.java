package com.oj.TDTUOJ.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.role.dto.RoleDTO;
import com.oj.TDTUOJ.role.entity.Role;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Multi-purpose user transfer object serving reads (profile/leaderboard) and
 * writes (self-update and admin edit). NON_NULL serialization keeps unset
 * fields out of responses; {@code roles} vs {@code roleNames} coexist because
 * JSON requests send the former while multipart admin forms send the latter.
 * {@code profileImage} is inbound-only (avatar upload) and never serialized back.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDTO {
    private Long id;

    private String username;

    private String name;

    private String email;

    private String password;

    private String about;

    private Boolean isActive;

    private String profileUrl;



    private Integer point;

    private Integer rating;

    /** Global leaderboard rank (1 = best) by rating desc, points desc; null if unranked (no positive score). */
    private Integer rank;

    private Set<RoleDTO> roles;

    private List<String> roleNames;

    private MultipartFile profileImage;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
