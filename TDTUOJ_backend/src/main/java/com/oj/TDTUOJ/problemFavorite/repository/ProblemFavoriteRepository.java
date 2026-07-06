package com.oj.TDTUOJ.problemFavorite.repository;

import com.oj.TDTUOJ.problemFavorite.entity.ProblemFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Data access for {@link ProblemFavorite} bookmark rows. */
public interface ProblemFavoriteRepository extends JpaRepository<ProblemFavorite, Long> {

    /** Look up an existing bookmark to decide whether a toggle should add or remove. */
    Optional<ProblemFavorite> findByUserIdAndProblemId(Long userId, Long problemId);

    /** All problems bookmarked by a user (backs the "my favorites" list). */
    List<ProblemFavorite> findByUserId(Long userId);

    /** Removes a bookmark; used by the "unfavorite" branch of the toggle. */
    void deleteByUserIdAndProblemId(Long userId, Long problemId);
}
