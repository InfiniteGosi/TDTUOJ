package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
import com.oj.TDTUOJ.contest.entity.ContestRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContestRegistrationRepository extends JpaRepository<ContestRegistration, Long> {

    Optional<ContestRegistration> findByContestIdAndUserId(Long contestId, Long userId);

    boolean existsByContestIdAndUserId(Long contestId, Long userId);

    boolean existsByContestIdAndUserIdAndStatus(Long contestId, Long userId, ContestRegistrationStatus status);

    long countByContestId(Long contestId);

    void deleteByContestIdAndUserId(Long contestId, Long userId);
}
