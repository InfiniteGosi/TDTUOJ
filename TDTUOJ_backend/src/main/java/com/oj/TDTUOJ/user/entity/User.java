package com.oj.TDTUOJ.user.entity;

import com.oj.TDTUOJ.problemFavorite.entity.ProblemFavorite;
import com.oj.TDTUOJ.role.entity.Role;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Core account entity. Backs both local (email/password) and federated
 * (Google) sign-in — {@code authProvider}/{@code providerId} distinguish the
 * two, and {@code password} is null for accounts that only ever used Google.
 */
@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username; // slug

    private String name;

    @Column(unique = true)
    private String email;

    private String password;

    // "LOCAL" for password accounts, "GOOGLE" for federated ones; drives which
    // login path is valid and whether a password is expected.
    @Column(nullable = false)
    @Builder.Default
    private String authProvider = "LOCAL";

    private String providerId; // external subject id from the OAuth provider (Google "sub")

    private String about;

    private Boolean isActive;

    private String profileUrl;

    // EAGER: roles are needed on nearly every authenticated request (authority
    // checks / JWT role claims), so they're loaded up-front to avoid lazy-init issues.
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "users_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProblemFavorite> favoriteProblems = new ArrayList<>();

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
