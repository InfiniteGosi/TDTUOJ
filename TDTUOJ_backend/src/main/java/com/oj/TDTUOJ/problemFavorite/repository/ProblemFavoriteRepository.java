package com.oj.TDTUOJ.problemFavorite.repository;

import com.oj.TDTUOJ.problemFavorite.entity.ProblemFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProblemFavoriteRepository extends JpaRepository<ProblemFavorite, Long> {

    Optional<ProblemFavorite> findByUserIdAndProblemId(Long userId, Long problemId);

    List<ProblemFavorite> findByUserId(Long userId);

    void deleteByUserIdAndProblemId(Long userId, Long problemId);
}
