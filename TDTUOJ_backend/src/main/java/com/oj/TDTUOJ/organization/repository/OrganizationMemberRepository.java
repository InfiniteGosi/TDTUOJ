package com.oj.TDTUOJ.organization.repository;

import com.oj.TDTUOJ.common.enums.OrganizationMemberRole;
import com.oj.TDTUOJ.organization.entity.OrganizationMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Data access for {@link OrganizationMember} — the membership roster and role lookups. */
@Repository
public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, Long> {

    // Primary role-check lookup: resolves a specific user's membership (and thus role) in an org.
    Optional<OrganizationMember> findByOrganizationIdAndUserId(Long organizationId, Long userId);

    boolean existsByOrganizationIdAndUserId(Long organizationId, Long userId);

    Page<OrganizationMember> findByOrganizationId(Long organizationId, Pageable pageable);

    /** Filter members by username. */
    Page<OrganizationMember> findByOrganizationIdAndUserUsernameContainingIgnoreCase(
            Long organizationId, String username, Pageable pageable);

    /** Only OWNER / ADMIN members — shown to non-members. */
    Page<OrganizationMember> findByOrganizationIdAndRoleIn(Long organizationId, Collection<OrganizationMemberRole> roles, Pageable pageable);

    List<OrganizationMember> findByUserId(Long userId);

    long countByOrganizationId(Long organizationId);

    void deleteByOrganizationIdAndUserId(Long organizationId, Long userId);

    /** Find all orgs a user belongs to (for "My Orgs" listing). */
    Page<OrganizationMember> findByUserId(Long userId, Pageable pageable);
}
