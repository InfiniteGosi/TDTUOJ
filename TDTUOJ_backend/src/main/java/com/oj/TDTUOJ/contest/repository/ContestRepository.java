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

/**
 * Data access for {@link Contest}. Beyond CRUD, exposes the two scheduler
 * queries that drive the post-contest lifecycle: unprocessed rated contests
 * (rating job) and ended contests with unpublished problems (auto-publish job).
 * Both are hand-written JPQL so NULL flag values (rows predating the column)
 * are matched, which derived queries would silently skip.
 */
@Repository
public interface ContestRepository extends JpaRepository<Contest, Long> {

    Optional<Contest> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Page<Contest> findByIsPublicTrue(Pageable pageable);

    Page<Contest> findByIsPublicTrueAndNameContainingIgnoreCase(String name, Pageable pageable);

    /**
     * Finds rated contests that have ended but whose ratings have not been processed yet.
     * Uses JPQL to also handle NULL values (from existing rows before the column was added).
     */
    @Query("SELECT c FROM Contest c WHERE c.isRated = true " +
           "AND (c.ratingProcessed = false OR c.ratingProcessed IS NULL) " +
           "AND c.endTime < :now " +
           "ORDER BY c.endTime ASC, c.id ASC")
    List<Contest> findUnprocessedRatedContests(@Param("now") LocalDateTime now);

    /**
     * Ended contests whose problems haven't been auto-published yet.
     * JPQL (not derived) so NULL rows from before the column existed match too.
     */
    @Query("SELECT c FROM Contest c WHERE c.endTime < :now " +
           "AND (c.problemsPublished IS NULL OR c.problemsPublished = false) " +
           "ORDER BY c.endTime ASC, c.id ASC")
    List<Contest> findEndedWithUnpublishedProblems(@Param("now") LocalDateTime now);
}
