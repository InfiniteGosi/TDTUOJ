package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestProblem;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Contest-fairness: once a contest ends, its (private) problems become part of
 * the public practice archive. Idempotent — guarded by Contest.problemsPublished.
 *
 * <p>Driven by {@link ContestRatingScheduler#publishEndedContestProblems()},
 * which calls {@link #publishContestProblems(Long)} per contest so each
 * contest gets its own transaction (proxy-routed, not self-invoked).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContestProblemPublishService {

    private final ContestRepository contestRepository;
    private final ProblemRepository problemRepository;

    /** Ended contests still awaiting problem publication. */
    public List<Contest> findDueContests(LocalDateTime now) {
        return contestRepository.findEndedWithUnpublishedProblems(now);
    }

    /**
     * Publish every still-private problem of an ended contest, then flag it.
     * Takes an id (not the detached entity) so the lazy contestProblems
     * collection loads inside this transaction.
     */
    @Transactional
    public void publishContestProblems(Long contestId) {
        Contest contest = contestRepository.findById(contestId).orElse(null);
        if (contest == null) return; // deleted between scan and publish
        int published = 0;
        for (ContestProblem cp : contest.getContestProblems()) {
            Problem p = cp.getProblem();
            if (p != null && !Boolean.TRUE.equals(p.getIsPublic())) {
                p.setIsPublic(true);
                problemRepository.save(p);
                published++;
            }
        }
        contest.setProblemsPublished(true);
        contestRepository.save(contest);
        log.info("Auto-published {} problem(s) for ended contest '{}' (id={})",
                published, contest.getName(), contest.getId());
    }
}
