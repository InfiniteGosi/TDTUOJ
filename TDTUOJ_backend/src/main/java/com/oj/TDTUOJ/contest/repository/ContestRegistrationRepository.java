package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.ContestRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContestRegistrationRepository extends JpaRepository<ContestRegistration, Long> {

    Optional<ContestRegistration> findByContestIdAndUserId(Long contestId, Long userId);

    boolean existsByContestIdAndUserId(Long contestId, Long userId);

    long countByContestId(Long contestId);
}
