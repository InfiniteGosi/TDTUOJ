package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Scheduled job that scans for rated contests whose judging period has
 * completed (endTime passed + all submissions judged) and triggers rating
 * calculation.
 *
 * <p>Runs every 60 seconds.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ContestRatingScheduler {

    private final ContestRepository             contestRepository;
    private final SubmissionRepository          submissionRepository;
    private final ContestRatingService          ratingService;
    private final ContestProblemPublishService  publishService;

    private static final List<SubmissionStatus> UNJUDGED_STATUSES =
            List.of(SubmissionStatus.PENDING, SubmissionStatus.RUNNING);

    @Scheduled(fixedDelay = 60_000)
    public void checkAndProcessRatings() {
        List<Contest> candidates = new ArrayList<>(contestRepository
                .findUnprocessedRatedContests(LocalDateTime.now()));

        // Defensive: guarantee chronological processing so chain rebuilds touch
        // only forward rows, never backward.
        candidates.sort(Comparator.comparing(
                Contest::getEndTime,
                Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Contest::getId, Comparator.nullsLast(Comparator.naturalOrder())));

        if (candidates.isEmpty()) {
            log.debug("Rating scheduler tick — no unprocessed rated contests found");
            return;
        }

        log.info("Rating scheduler found {} contest(s) to process", candidates.size());

        for (Contest contest : candidates) {
            // Only process when all submissions for this contest are COMPLETED
            boolean hasUnjudged = submissionRepository
                    .existsByContestIdAndSubmissionStatusIn(contest.getId(), UNJUDGED_STATUSES);

            if (hasUnjudged) {
                log.info("Contest '{}' (id={}) has unjudged submissions — skipping rating for now",
                        contest.getName(), contest.getId());
                continue;
            }

            log.info("Processing ratings for contest '{}' (id={})", contest.getName(), contest.getId());
            try {
                ratingService.processRatings(contest);
            } catch (Exception e) {
                log.error("Failed to process ratings for contestId={}", contest.getId(), e);
            }
        }
    }

    /**
     * Contest-fairness: publish problems of ended contests (rated AND unrated)
     * to the public archive. Each contest in its own transaction so one
     * failure can't block the rest.
     */
    @Scheduled(fixedDelay = 60_000, initialDelay = 20_000)
    public void publishEndedContestProblems() {
        List<Contest> due = publishService.findDueContests(LocalDateTime.now());
        if (due.isEmpty()) return;

        log.info("Problem-publish scheduler found {} ended contest(s) to publish", due.size());
        for (Contest contest : due) {
            try {
                publishService.publishContestProblems(contest.getId());
            } catch (Exception e) {
                log.error("Failed to publish problems for contestId={}", contest.getId(), e);
            }
        }
    }
}
