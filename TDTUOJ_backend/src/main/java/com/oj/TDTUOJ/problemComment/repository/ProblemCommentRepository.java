package com.oj.TDTUOJ.problemComment.repository;

import com.oj.TDTUOJ.problemComment.entity.ProblemComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProblemCommentRepository extends JpaRepository<ProblemComment, Long> {

    /**
     * Fetch paginated top-level comments (parent IS NULL) for a problem, newest first.
     */
    Page<ProblemComment> findByProblemIdAndParentIsNull(Long problemId, Pageable pageable);

    /**
     * Non-paginated version kept for internal use (vote patching, etc.).
     * @deprecated Prefer the paginated variant for API responses.
     */
    List<ProblemComment> findByProblemIdAndParentIsNullOrderByCreatedAtDesc(Long problemId);

    /**
     * Fetch a single comment by id, ensuring it belongs to the given problem.
     */
    Optional<ProblemComment> findByIdAndProblemId(Long id, Long problemId);

    /**
     * Count non-deleted top-level comments for display badge.
     */
    @Query("SELECT COUNT(c) FROM ProblemComment c WHERE c.problem.id = :problemId AND c.parent IS NULL AND c.isDeleted = false")
    Long countVisibleTopLevelByProblemId(@Param("problemId") Long problemId);
}
