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

    // ── Admin dashboard aggregates ────────────────────────────────────────── //

    /** Problem counts grouped by difficulty (admin dashboard). */
    @Query("SELECT p.problemDifficulty, COUNT(p) FROM Problem p GROUP BY p.problemDifficulty")
    List<Object[]> countGroupedByDifficulty();

    /** Problem counts grouped by ACTIVE tag name, most-used first (admin dashboard). */
    @Query("SELECT t.name, COUNT(p) FROM Problem p JOIN p.tags t WHERE t.isActive = true " +
           "GROUP BY t.name ORDER BY COUNT(p) DESC")
    List<Object[]> countGroupedByTag(Pageable pageable);
}
