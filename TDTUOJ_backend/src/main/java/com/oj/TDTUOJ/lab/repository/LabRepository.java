package com.oj.TDTUOJ.lab.repository;

import com.oj.TDTUOJ.lab.entity.Lab;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LabRepository extends JpaRepository<Lab, Long> {

    Page<Lab> findByOrganizationId(Long organizationId, Pageable pageable);

    Optional<Lab> findByOrganizationIdAndSlug(Long organizationId, String slug);

    boolean existsByOrganizationIdAndSlug(Long organizationId, String slug);
}
