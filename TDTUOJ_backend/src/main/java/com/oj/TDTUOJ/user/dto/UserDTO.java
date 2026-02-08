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

    private Set<RoleDTO> roles;

    private MultipartFile profileImage;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
