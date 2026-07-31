package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestParticipation;
import com.oj.TDTUOJ.contest.entity.RatingHistory;
import com.oj.TDTUOJ.contest.repository.ContestParticipationRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.contest.repository.RatingHistoryRepository;
import com.oj.TDTUOJ.common.enums.ContestStyle;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.userStatistics.entity.UserStatistics;
import com.oj.TDTUOJ.userStatistics.repository.UserStatisticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Computes rating changes after a rated contest's judging period ends.
 *
 * <h3>Simplified seed-based formula</h3>
 * <pre>
 *   seed  = 1 + count(participants whose current rating &gt; yours)
 *   delta = round( K * (seed - rank) / N )
 * </pre>
 *
 * <p><b>Chain consistency:</b> A user's {@code oldRating} for a contest is the
 * {@code newRating} of their immediately-prior contest by {@code contestEndTime}
 * (or {@link #DEFAULT_RATING} if none). After (re)processing a contest, every
 * downstream row for each affected user is rewritten so that
 * {@code row[n].oldRating == row[n-1].newRating}, and the user's
 * {@link UserStatistics#getCurrentRating()} is set to the chain tail.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContestRatingService {

    public static final int DEFAULT_RATING = 1500;
    private static final int K              = 100;
    private static final int MAX_DELTA      = 150;

    private final ContestRepository              contestRepository;
    private final ContestParticipationRepository  participationRepository;
    private final RatingHistoryRepository         ratingHistoryRepository;
    private final UserStatisticsRepository        userStatisticsRepository;

    /**
     * Process ratings for a single contest.
     * Must only be called when all submissions are COMPLETED.
     */
    @Transactional
    public void processRatings(Contest contest) {
        // ── Step 0: Wipe any previous rating rows for this contest. We do NOT
        // try to roll back UserStatistics here; the chain rebuild at the end
        // will write the correct final value for every affected user.
        List<RatingHistory> oldHistory = ratingHistoryRepository.findByContestId(contest.getId());
        if (!oldHistory.isEmpty()) {
            log.info("Wiping {} previous rating entries for contestId={}",
                    oldHistory.size(), contest.getId());
            ratingHistoryRepository.deleteAll(oldHistory);
            ratingHistoryRepository.flush();
            // Clear participation snapshots so they get repopulated below.
            participationRepository.findByContestIdOrderByRankAsc(contest.getId())
                    .forEach(cp -> {
                        cp.setRatingBefore(null);
                        cp.setRatingAfter(null);
                        participationRepository.save(cp);
                    });
        }

        // Use JOIN FETCH so User entities are eagerly loaded
        List<ContestParticipation> participations =
                participationRepository.findByContestIdWithUserOrderByRankAsc(contest.getId());

        if (participations.isEmpty()) {
            log.info("No participations for contestId={} — skipping rating", contest.getId());
            contest.setRatingProcessed(true);
            contestRepository.save(contest);
            return;
        }

        int n = participations.size();
        log.info("Computing ratings for contestId={} '{}' with {} participant(s)",
                contest.getId(), contest.getName(), n);

        // 1. Sort participations by contest style.
        //    We do NOT trust cp.getRank() because it is updated asynchronously and may be stale.
        if (contest.getContestStyle() == ContestStyle.IOI) {
            // IOI: highest total points DESC, tiebreak by most problems solved DESC
            participations.sort((a, b) -> {
                int ptsA = a.getPointsEarned() != null ? a.getPointsEarned() : 0;
                int ptsB = b.getPointsEarned() != null ? b.getPointsEarned() : 0;
                if (ptsA != ptsB) return Integer.compare(ptsB, ptsA);
                int solvedA = a.getProblemsSolved() != null ? a.getProblemsSolved() : 0;
                int solvedB = b.getProblemsSolved() != null ? b.getProblemsSolved() : 0;
                return Integer.compare(solvedB, solvedA);
            });
        } else {
            // ICPC: most problems solved DESC, then lowest penalty ASC
            participations.sort((a, b) -> {
                int solvedA = a.getProblemsSolved() != null ? a.getProblemsSolved() : 0;
                int solvedB = b.getProblemsSolved() != null ? b.getProblemsSolved() : 0;
                if (solvedA != solvedB) return Integer.compare(solvedB, solvedA); // desc
                int penaltyA = a.getPenaltyTime() != null ? a.getPenaltyTime() : 0;
                int penaltyB = b.getPenaltyTime() != null ? b.getPenaltyTime() : 0;
                return Integer.compare(penaltyA, penaltyB); // asc
            });
        }

        // 2. Resolve oldRating from the chain: prior RatingHistory row by end-time,
        //    or DEFAULT_RATING if user has none.
        int[] ratings = new int[n];
        LocalDateTime endTime = contest.getEndTime();
        for (int i = 0; i < n; i++) {
            User user = participations.get(i).getUser();
            ratings[i] = priorRating(user.getId(), endTime);
            log.info("  rank={} userId={} username={} solved={} penalty={} oldRating(chain)={}",
                    i + 1, user.getId(), user.getUsername(),
                    participations.get(i).getProblemsSolved(),
                    participations.get(i).getPenaltyTime(),
                    ratings[i]);
        }

        // 3. Compute seed and delta for each participant
        for (int i = 0; i < n; i++) {
            ContestParticipation cp = participations.get(i);
            User user = cp.getUser();
            int myRating = ratings[i];

            // seed = 1 + count of participants with strictly higher rating
            int seed = 1;
            for (int j = 0; j < n; j++) {
                if (j != i && ratings[j] > myRating) seed++;
            }

            // Rank derived from sorted position (1-based)
            int rank = i + 1;

            // delta = K * (seed - rank) / N
            int delta;
            if (n <= 1) {
                delta = 0;
            } else {
                delta = Math.round((float) K * (seed - rank) / n);
            }

            // Cap
            delta = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, delta));

            int oldRating = myRating;
            int newRating = Math.max(1, oldRating + delta); // never go below 1

            // 4. Persist: update participation snapshot
            cp.setRatingBefore(oldRating);
            cp.setRatingAfter(newRating);
            participationRepository.save(cp);

            // 5. Persist: rating history row
            RatingHistory history = RatingHistory.builder()
                    .user(user)
                    .contestId(contest.getId())
                    .contestName(contest.getName())
                    .oldRating(oldRating)
                    .newRating(newRating)
                    .ratingChange(delta)
                    .rank(rank)
                    .contestEndTime(endTime)
                    .build();
            ratingHistoryRepository.save(history);

            log.info("  Inserted: userId={} rank={} seed={} delta={} {} → {}",
                    user.getId(), rank, seed, delta, oldRating, newRating);
        }

        ratingHistoryRepository.flush();

        // 6. Rebuild downstream chain per affected user. This also writes the
        //    correct final UserStatistics.currentRating for each.
        for (ContestParticipation cp : participations) {
            rebuildChainFrom(cp.getUser().getId(), endTime);
        }

        // 7. Mark contest as processed
        contest.setRatingProcessed(true);
        contestRepository.save(contest);

        log.info("Rating processed for contestId={} '{}' — {} participants",
                contest.getId(), contest.getName(), n);
    }

    /**
     * Rebuild the rating chain for a user from {@code fromEndTime} onward.
     * Assumes the row at {@code fromEndTime} (if any) is already correctly
     * stored; rewrites every row strictly after to keep
     * {@code row.oldRating == previousRow.newRating}. {@code ratingChange} is
     * preserved (treated as the source of truth); {@code newRating} is
     * recomputed as {@code max(1, oldRating + ratingChange)}.
     *
     * <p>After the walk completes, sets {@link UserStatistics#getCurrentRating()}
     * to the chain tail and bumps {@code maxRating} if necessary.
     */
    @Transactional
    public void rebuildChainFrom(Long userId, LocalDateTime fromEndTime) {
        // Seed: use the row at fromEndTime if present, else the prior row, else DEFAULT_RATING.
        Optional<RatingHistory> anchor = ratingHistoryRepository
                .findTopByUserIdAndContestEndTimeLessThanOrderByContestEndTimeDescIdDesc(
                        userId, fromEndTime.plusNanos(1));
        int running = anchor.map(RatingHistory::getNewRating).orElse(DEFAULT_RATING);

        List<RatingHistory> downstream = ratingHistoryRepository
                .findByUserIdAndContestEndTimeGreaterThanOrderByContestEndTimeAscIdAsc(
                        userId, fromEndTime);

        for (RatingHistory row : downstream) {
            int delta = row.getRatingChange() != null ? row.getRatingChange() : 0;
            int oldRating = running;
            int newRating = Math.max(1, oldRating + delta);
            if (!Integer.valueOf(oldRating).equals(row.getOldRating())
                    || !Integer.valueOf(newRating).equals(row.getNewRating())) {
                row.setOldRating(oldRating);
                row.setNewRating(newRating);
                ratingHistoryRepository.save(row);
            }
            running = newRating;
        }

        // Tail → UserStatistics
        UserStatistics stats = userStatisticsRepository.findByUserId(userId)
                .orElseGet(() -> userStatisticsRepository.save(
                        UserStatistics.builder().userId(userId).build()));
        stats.setCurrentRating(running);
        int currentMax = stats.getMaxRating() != null ? stats.getMaxRating() : 0;
        int chainMax = chainMax(userId);
        if (chainMax > currentMax) {
            stats.setMaxRating(chainMax);
        }
        userStatisticsRepository.save(stats);
    }

    /** Lookup user's rating just before {@code endTime} via the chain. */
    private int priorRating(Long userId, LocalDateTime endTime) {
        return ratingHistoryRepository
                .findTopByUserIdAndContestEndTimeLessThanOrderByContestEndTimeDescIdDesc(userId, endTime)
                .map(RatingHistory::getNewRating)
                .orElse(DEFAULT_RATING);
    }

    /** Highest newRating across user's full chain. */
    private int chainMax(Long userId) {
        int max = 0;
        for (RatingHistory r : ratingHistoryRepository.findByUserIdOrderByContestEndTimeAscIdAsc(userId)) {
            if (r.getNewRating() != null && r.getNewRating() > max) max = r.getNewRating();
        }
        return max;
    }
}
