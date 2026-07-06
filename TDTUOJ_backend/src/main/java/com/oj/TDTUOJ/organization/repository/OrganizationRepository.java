package com.oj.TDTUOJ.organization.repository;

import com.oj.TDTUOJ.organization.entity.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Data access for {@link Organization}. Slug and code are both globally unique, hence the exists/find-by lookups. */
@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findBySlug(String slug);

    Optional<Organization> findByCode(String code);

    // Uniqueness pre-checks used when generating slugs / validating custom join codes.
    boolean existsBySlug(String slug);

    boolean existsByCode(String code);

    // Public-only listings (private orgs hidden from discovery); the *NameContaining* variant backs search.
    Page<Organization> findByIsPublicTrue(Pageable pageable);

    Page<Organization> findByIsPublicTrueAndNameContainingIgnoreCase(String name, Pageable pageable);

    /** All orgs (public + private) — for browse/discover listing. */
    Page<Organization> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
