package com.oj.TDTUOJ.organization.entity;

import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A group (e.g. a class or course) that owns labs and has a roster of members.
 * Visibility is controlled by {@link #isPublic}: public orgs can be joined freely,
 * private orgs require the secret {@link #code} to join.
 */
@Entity
@Data
@Table(name = "organizations")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Secret join code (globally unique). Required to join a private org; only
    // exposed in DTOs to the org OWNER/ADMIN and platform admins.
    @Column(unique = true, nullable = false, length = 10)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String about;

    // URL-facing identifier, globally unique (unlike lab slugs which are per-org).
    @Column(unique = true, nullable = false)
    private String slug;

    // Public orgs are joinable without a code and fully listed to non-members; private orgs are code-gated.
    @Column(name = "is_public")
    @Builder.Default
    private Boolean isPublic = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    private User creator;

    @OneToMany(mappedBy = "organization", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<OrganizationMember> members = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
