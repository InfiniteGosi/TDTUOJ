package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestParticipation;
import com.oj.TDTUOJ.contest.entity.RatingHistory;
import com.oj.TDTUOJ.contest.repository.ContestParticipationRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.contest.repository.RatingHistoryRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.userStatistics.entity.UserStatistics;
import com.oj.TDTUOJ.userStatistics.repository.UserStatisticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Computes rating changes after a rated contest's judging period ends.
 *
 * <h3>Simplified seed-based formula</h3>
 * <pre>
 *   seed  = 1 + count(participants whose current rating &gt; yours)
 *   delta = round( K * (seed - rank) / N )
 * </pre>
 *
 * <ul>
 *   <li><b>seed</b> – your expected rank based on ratings (highest rated → seed 1)</li>
 *   <li><b>rank</b> – your actual finishing rank from the leaderboard</li>
 *   <li><b>K = 100</b> – scaling factor</li>
 *   <li><b>N</b> – total participants who have a participation row</li>
 *   <li>Cap: ±150 per contest</li>
 *   <li>Default rating for new users: 1500</li>
 * </ul>
 *
 * If you beat your expected rank → positive delta.
 * If you underperform → negative delta.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContestRatingService {

    private static final int DEFAULT_RATING = 1500;
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
        // ── Step 0: Roll back any previous rating processing for this contest ──
        List<RatingHistory> oldHistory = ratingHistoryRepository.findByContestId(contest.getId());
        if (!oldHistory.isEmpty()) {
            log.info("Rolling back {} previous rating entries for contestId={}",
                    oldHistory.size(), contest.getId());
            for (RatingHistory rh : oldHistory) {
                userStatisticsRepository.findByUserId(rh.getUser().getId()).ifPresent(stats -> {
                    int rollbackRating = stats.getCurrentRating() - rh.getRatingChange();
                    rollbackRating = Math.max(1, rollbackRating);
                    stats.setCurrentRating(rollbackRating);
                    userStatisticsRepository.save(stats);
                    log.info("  Rolled back userId={} rating {} → {} (undid {})",
                            rh.getUser().getId(), stats.getCurrentRating() + rh.getRatingChange(),
                            rollbackRating, rh.getRatingChange());
                });
            }
            ratingHistoryRepository.deleteAll(oldHistory);
            // Clear participation snapshots
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

        // 1. Sort participations by ICPC rules: most problems solved DESC, then lowest penalty ASC.
        //    We do NOT trust cp.getRank() because it is updated asynchronously and may be stale.
        participations.sort((a, b) -> {
            int solvedA = a.getProblemsSolved() != null ? a.getProblemsSolved() : 0;
            int solvedB = b.getProblemsSolved() != null ? b.getProblemsSolved() : 0;
            if (solvedA != solvedB) return Integer.compare(solvedB, solvedA); // desc
            int penaltyA = a.getPenaltyTime() != null ? a.getPenaltyTime() : 0;
            int penaltyB = b.getPenaltyTime() != null ? b.getPenaltyTime() : 0;
            return Integer.compare(penaltyA, penaltyB); // asc
        });

        // 2. Resolve current ratings from user_statistics (null or 0 → default 1500)
        int[] ratings = new int[n];
        UserStatistics[] statsArr = new UserStatistics[n];
        for (int i = 0; i < n; i++) {
            User user = participations.get(i).getUser();
            UserStatistics stats = userStatisticsRepository.findByUserId(user.getId())
                    .orElseGet(() -> {
                        UserStatistics fresh = UserStatistics.builder()
                                .userId(user.getId())
                                .build();
                        return userStatisticsRepository.save(fresh);
                    });
            statsArr[i] = stats;
            int r = (stats.getCurrentRating() != null && stats.getCurrentRating() > 0)
                    ? stats.getCurrentRating() : DEFAULT_RATING;
            ratings[i] = r;
            log.info("  rank={} participant: userId={} username={} solved={} penalty={} currentRating={} effectiveRating={}",
                    i + 1, user.getId(), user.getUsername(),
                    participations.get(i).getProblemsSolved(),
                    participations.get(i).getPenaltyTime(),
                    stats.getCurrentRating(), ratings[i]);
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
                    .build();
            ratingHistoryRepository.save(history);

            // 6. Update user_statistics (single source of truth for rating)
            UserStatistics stats = statsArr[i];
            stats.setCurrentRating(newRating);
            if (newRating > (stats.getMaxRating() != null ? stats.getMaxRating() : 0)) {
                stats.setMaxRating(newRating);
            }
            userStatisticsRepository.save(stats);

            log.info("  Rating: userId={} username={} rank={} seed={} delta={} {} → {}",
                    user.getId(), user.getUsername(), rank, seed, delta, oldRating, newRating);
        }

        // 7. Mark contest as processed
        contest.setRatingProcessed(true);
        contestRepository.save(contest);

        log.info("Rating processed for contestId={} '{}' — {} participants",
                contest.getId(), contest.getName(), n);
    }
}
