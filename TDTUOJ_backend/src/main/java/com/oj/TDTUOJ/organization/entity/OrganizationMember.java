package com.oj.TDTUOJ.organization.entity;

import com.oj.TDTUOJ.common.enums.OrganizationMemberRole;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Membership link between a {@link User} and an {@link Organization}, carrying the
 * user's role within that org. The {@code (organization_id, user_id)} unique
 * constraint enforces at most one membership row per user per org.
 *
 * <p>Role semantics: exactly one OWNER per org (the creator; role is transferred,
 * never reassigned via the normal role-update path), ADMINs help manage members,
 * and MEMBERs are ordinary participants.
 */
@Entity
@Data
@Table(name = "organization_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"organization_id", "user_id"}))
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OrganizationMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    // OWNER / ADMIN / MEMBER. Stored as a string (not ordinal) so enum reordering can't corrupt existing rows.
    // New joins default to MEMBER; the org creator is explicitly created as OWNER.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrganizationMemberRole role = OrganizationMemberRole.MEMBER;

    @CreationTimestamp
    private LocalDateTime joinedAt;
}
