package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.Contest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContestRepository extends JpaRepository<Contest, Long> {

    Optional<Contest> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Page<Contest> findByIsPublicTrue(Pageable pageable);
}
