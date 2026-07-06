package com.oj.TDTUOJ.problem.repository;

import com.oj.TDTUOJ.common.enums.ProblemDifficulty;
import com.oj.TDTUOJ.problem.entity.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


/**
 * Data-access for {@link Problem}.
 *
 * <p>Note the two families of finders: public-facing queries carry an
 * {@code AndIsPublicTrue} suffix (or {@code p.isPublic = true} in JPQL) so the open
 * problem set never leaks private/lecturer problems; the {@code findByAuthorId*} /
 * {@code findContestEligible*} finders deliberately omit that guard because they serve
 * the authenticated lecturer repository and contest-attachment flows.</p>
 */
@Repository
public interface ProblemRepository extends JpaRepository<Problem, Long> {

    Optional<Problem> findBySlug(String slug);

    boolean existsByTitle(String title);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Page<Problem> findByTitleContainingIgnoreCaseAndIsPublicTrue(String title, Pageable pageable);

    Page<Problem> findByProblemDifficultyAndIsPublicTrue(ProblemDifficulty difficulty, Pageable pageable);

    Page<Problem> findByTitleContainingIgnoreCaseAndProblemDifficultyAndIsPublicTrue(
            String title, ProblemDifficulty difficulty, Pageable pageable);

    /**
     * Filter by ACTIVE tag names only (AND semantics — problem must have ALL requested tags).
     */
    @Query("""
            SELECT p FROM Problem p
            JOIN p.tags t
            WHERE t.name IN :tagNames
              AND t.isActive = true
              AND p.isPublic = true
            GROUP BY p
            HAVING COUNT(DISTINCT t.name) = :tagCount
            """)
    // HAVING COUNT(DISTINCT t.name) = tagCount enforces AND (not OR) semantics:
    // a problem qualifies only if it matched every requested tag, not just one.
    Page<Problem> findByTagNames(@Param("tagNames") List<String> tagNames,
                                 @Param("tagCount") Long tagCount,
                                 Pageable pageable);

    /**
     * Filter by ACTIVE tag names AND difficulty.
     */
    @Query("""
            SELECT p FROM Problem p
            JOIN p.tags t
            WHERE t.name IN :tagNames
              AND t.isActive = true
              AND p.isPublic = true
              AND p.problemDifficulty = :difficulty
            GROUP BY p
            HAVING COUNT(DISTINCT t.name) = :tagCount
            """)
    Page<Problem> findByTagNamesAndDifficulty(@Param("tagNames") List<String> tagNames,
                                              @Param("tagCount") Long tagCount,
                                              @Param("difficulty") ProblemDifficulty difficulty,
                                              Pageable pageable);

    /**
     * Filter by title AND ACTIVE tag names.
     */
    @Query("""
            SELECT p FROM Problem p
            JOIN p.tags t
            WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND t.name IN :tagNames
              AND t.isActive = true
              AND p.isPublic = true
            GROUP BY p
            HAVING COUNT(DISTINCT t.name) = :tagCount
            """)
    Page<Problem> findByTitleContainingIgnoreCaseAndTagNames(@Param("title") String title,
                                                             @Param("tagNames") List<String> tagNames,
                                                             @Param("tagCount") Long tagCount,
                                                             Pageable pageable);

    /**
     * Filter by title, ACTIVE tag names, AND difficulty.
     */
    @Query("""
            SELECT p FROM Problem p
            JOIN p.tags t
            WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND t.name IN :tagNames
              AND t.isActive = true
              AND p.isPublic = true
              AND p.problemDifficulty = :difficulty
            GROUP BY p
            HAVING COUNT(DISTINCT t.name) = :tagCount
            """)
    Page<Problem> findByTitleAndTagsAndDifficulty(@Param("title") String title,
                                                  @Param("tagNames") List<String> tagNames,
                                                  @Param("tagCount") Long tagCount,
                                                  @Param("difficulty") ProblemDifficulty difficulty,
                                                  Pageable pageable);

    // Spring Data derives this from the method name — kept as alias for clarity
    default Page<Problem> findByTitleContainingIgnoreCaseAndDifficulty(
            String title, ProblemDifficulty difficulty, Pageable pageable) {
        return findByTitleContainingIgnoreCaseAndProblemDifficultyAndIsPublicTrue(title, difficulty, pageable);
    }

    // ── Public problem listing ─────────────────────────────────────────── //

    Page<Problem> findByIsPublicTrue(Pageable pageable);

    // ── Lecturer's problem repository ─────────────────────────────────────── //

    Page<Problem> findByAuthorId(Long authorId, Pageable pageable);

    Page<Problem> findByAuthorIdAndTitleContainingIgnoreCase(Long authorId, String title, Pageable pageable);

    // ── Contest-eligible problems ─────────────────────────────────────────── //

    /**
     * Contest-eligible problems for a CREATOR: private, authored by them,
     * and untouched by anyone else (author's own test submissions allowed).
     * Mirrors ContestServiceImpl.validateProblemEligibleForContest — keep in sync.
     */
    @Query("SELECT p FROM Problem p WHERE p.author.id = :authorId AND p.isPublic = false " +
           "AND NOT EXISTS (SELECT s FROM com.oj.TDTUOJ.submission.entity.Submission s " +
           "                WHERE s.problem.id = p.id AND s.userId <> :authorId) " +
           "AND LOWER(p.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Problem> findContestEligibleByAuthor(@Param("authorId") Long authorId,
                                              @Param("search") String search,
                                              Pageable pageable);

    /** Contest-eligible problems for an ADMIN: any private problem untouched by non-authors. */
    @Query("SELECT p FROM Problem p WHERE p.isPublic = false " +
           "AND NOT EXISTS (SELECT s FROM com.oj.TDTUOJ.submission.entity.Submission s " +
           "                WHERE s.problem.id = p.id " +
           "                AND (p.author IS NULL OR s.userId <> p.author.id)) " +
           "AND LOWER(p.title) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Problem> findContestEligibleAll(@Param("search") String search, Pageable pageable);

    // ── Admin dashboard aggregates ────────────────────────────────────────── //

    /** Problem counts grouped by difficulty (admin dashboard). */
    @Query("SELECT p.problemDifficulty, COUNT(p) FROM Problem p GROUP BY p.problemDifficulty")
    List<Object[]> countGroupedByDifficulty();

    /** Problem counts grouped by ACTIVE tag name, most-used first (admin dashboard). */
    @Query("SELECT t.name, COUNT(p) FROM Problem p JOIN p.tags t WHERE t.isActive = true " +
           "GROUP BY t.name ORDER BY COUNT(p) DESC")
    List<Object[]> countGroupedByTag(Pageable pageable);
}
