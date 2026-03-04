package com.oj.TDTUOJ.problem.repository;

import com.oj.TDTUOJ.problem.entity.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;


public interface ProblemRepository extends JpaRepository<Problem, Long> {
    Page<Problem> findByTitleContainingIgnoreCase(String title, Pageable pageable);
    Boolean existsByTitle(String title);
    Optional<Problem> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);

    /**
     * Filter problems by a list of ACTIVE tag names (AND semantics — problem must have ALL requested tags).
     * Inactive tags are excluded from matching so they cannot be used as filters.
     */
    @Query("""
            SELECT p FROM Problem p
            JOIN p.tags t
            WHERE t.name IN :tagNames
              AND t.isActive = true
            GROUP BY p
            HAVING COUNT(DISTINCT t.name) = :tagCount
            """)
    Page<Problem> findByTagNames(@Param("tagNames") List<String> tagNames,
                                 @Param("tagCount") Long tagCount,
                                 Pageable pageable);

    /**
     * Filter problems by title AND ACTIVE tag names (AND semantics for tags).
     */
    @Query("""
            SELECT p FROM Problem p
            JOIN p.tags t
            WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND t.name IN :tagNames
              AND t.isActive = true
            GROUP BY p
            HAVING COUNT(DISTINCT t.name) = :tagCount
            """)
    Page<Problem> findByTitleContainingIgnoreCaseAndTagNames(@Param("title") String title,
                                                             @Param("tagNames") List<String> tagNames,
                                                             @Param("tagCount") Long tagCount,
                                                             Pageable pageable);
}
