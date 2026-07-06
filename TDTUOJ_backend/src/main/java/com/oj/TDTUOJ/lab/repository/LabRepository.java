package com.oj.TDTUOJ.lab.repository;

import com.oj.TDTUOJ.lab.entity.Lab;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Data access for {@link Lab}. All lookups are scoped by organization since slugs are only unique per-org. */
@Repository
public interface LabRepository extends JpaRepository<Lab, Long> {

    Page<Lab> findByOrganizationId(Long organizationId, Pageable pageable);

    Optional<Lab> findByOrganizationIdAndSlug(Long organizationId, String slug);

    // Used to de-duplicate generated slugs within an org before insert.
    boolean existsByOrganizationIdAndSlug(Long organizationId, String slug);
}
