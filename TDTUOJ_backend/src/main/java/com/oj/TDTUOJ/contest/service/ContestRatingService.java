package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestParticipation;
import com.oj.TDTUOJ.contest.entity.RatingHistory;
import com.oj.TDTUOJ.contest.repository.ContestParticipationRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.contest.repository.RatingHistoryRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.userstatistics.entity.UserStatistics;
import com.oj.TDTUOJ.userstatistics.repository.UserStatisticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
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
    private final UserRepository                  userRepository;
    private final UserStatisticsRepository        userStatisticsRepository;

    /**
     * Process ratings for a single contest.
     * Must only be called when all submissions are COMPLETED.
     */
    @Transactional
    public void processRatings(Contest contest) {
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

        // 1. Resolve current ratings (null or 0 → default 1500)
        int[] ratings = new int[n];
        for (int i = 0; i < n; i++) {
            User user = participations.get(i).getUser();
            Integer r = user.getRating();
            ratings[i] = (r != null && r > 0) ? r : DEFAULT_RATING;
            log.info("  participant: userId={} username={} currentRating={} effectiveRating={}",
                    user.getId(), user.getUsername(), r, ratings[i]);
        }

        // 2. Sort participations by rank ascending (should already be, but enforce)
        participations.sort(Comparator.comparingInt(p -> p.getRank() != null ? p.getRank() : Integer.MAX_VALUE));

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

            int rank = cp.getRank() != null && cp.getRank() > 0 ? cp.getRank() : n;

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

            // 5. Persist: rating history row (idempotency guard)
            if (!ratingHistoryRepository.existsByContestIdAndUserId(contest.getId(), user.getId())) {
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
            }

            // 6. Update user's current rating
            user.setRating(newRating);
            userRepository.save(user);

            // 7. Update user_statistics table (currentRating + maxRating)
            userStatisticsRepository.findByUserId(user.getId()).ifPresent(stats -> {
                stats.setCurrentRating(newRating);
                if (newRating > (stats.getMaxRating() != null ? stats.getMaxRating() : 0)) {
                    stats.setMaxRating(newRating);
                }
                userStatisticsRepository.save(stats);
            });

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
