package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.Contest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContestRepository extends JpaRepository<Contest, Long> {

    Optional<Contest> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Page<Contest> findByIsPublicTrue(Pageable pageable);

    /**
     * Finds rated contests that have ended but whose ratings have not been processed yet.
     * Uses JPQL to also handle NULL values (from existing rows before the column was added).
     */
    @Query("SELECT c FROM Contest c WHERE c.isRated = true " +
           "AND (c.ratingProcessed = false OR c.ratingProcessed IS NULL) " +
           "AND c.endTime < :now")
    List<Contest> findUnprocessedRatedContests(@Param("now") LocalDateTime now);
}
