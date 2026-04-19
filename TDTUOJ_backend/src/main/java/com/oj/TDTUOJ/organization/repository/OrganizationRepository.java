package com.oj.TDTUOJ.organization.repository;

import com.oj.TDTUOJ.organization.entity.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findBySlug(String slug);

    Optional<Organization> findByCode(String code);

    boolean existsBySlug(String slug);

    boolean existsByCode(String code);

    Page<Organization> findByIsPublicTrue(Pageable pageable);

    Page<Organization> findByIsPublicTrueAndNameContainingIgnoreCase(String name, Pageable pageable);

    /** All orgs (public + private) — for browse/discover listing. */
    Page<Organization> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
