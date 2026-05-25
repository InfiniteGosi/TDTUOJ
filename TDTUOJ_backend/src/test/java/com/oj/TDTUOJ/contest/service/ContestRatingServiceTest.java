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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Frozen as of 2026-05-25")
@ExtendWith(MockitoExtension.class)
class ContestRatingServiceTest {
    @Mock private ContestRepository contestRepository;
    @Mock private ContestParticipationRepository participationRepository;
    @Mock private RatingHistoryRepository ratingHistoryRepository;
    @Mock private UserStatisticsRepository userStatisticsRepository;

    @InjectMocks private ContestRatingService ratingService;

    private User user(Long id) {
        User u = new User();
        u.setId(id);
        u.setUsername("u" + id);
        return u;
    }

    private ContestParticipation participation(User u, int solved, int penalty) {
        return ContestParticipation.builder()
                .user(u)
                .problemsSolved(solved)
                .penaltyTime(penalty)
                .build();
    }

    private Contest contest(Long id, LocalDateTime endTime) {
        Contest c = new Contest();
        c.setId(id);
        c.setName("RatedContest");
        c.setEndTime(endTime);
        return c;
    }

    @Test
    void processRatings_NoParticipants_MarksProcessedAndExits() {
        Contest c = contest(1L, LocalDateTime.now());
        when(ratingHistoryRepository.findByContestId(1L)).thenReturn(Collections.emptyList());
        when(participationRepository.findByContestIdWithUserOrderByRankAsc(1L))
                .thenReturn(Collections.emptyList());

        ratingService.processRatings(c);

        assertTrue(c.getRatingProcessed());
        verify(contestRepository).save(c);
        verify(ratingHistoryRepository, never()).save(any());
    }

    @Test
    void processRatings_AppliesEloAndPersistsHistory() {
        // given two participants, no prior rating → both 1500
        LocalDateTime endTime = LocalDateTime.of(2026, 5, 25, 12, 0);
        Contest c = contest(2L, endTime);
        User a = user(10L);
        User b = user(20L);
        List<ContestParticipation> ps = new ArrayList<>(List.of(
                participation(a, 5, 100),
                participation(b, 3, 200)));

        when(ratingHistoryRepository.findByContestId(2L)).thenReturn(Collections.emptyList());
        when(participationRepository.findByContestIdWithUserOrderByRankAsc(2L)).thenReturn(ps);
        when(ratingHistoryRepository
                .findTopByUserIdAndContestEndTimeLessThanOrderByContestEndTimeDescIdDesc(anyLong(), any()))
                .thenReturn(Optional.empty());
        when(ratingHistoryRepository
                .findByUserIdAndContestEndTimeGreaterThanOrderByContestEndTimeAscIdAsc(anyLong(), any()))
                .thenReturn(Collections.emptyList());
        when(ratingHistoryRepository.findByUserIdOrderByContestEndTimeAscIdAsc(anyLong()))
                .thenReturn(Collections.emptyList());
        when(userStatisticsRepository.findByUserId(anyLong()))
                .thenReturn(Optional.of(UserStatistics.builder().build()));

        // when
        ratingService.processRatings(c);

        // then — two history rows persisted
        ArgumentCaptor<RatingHistory> cap = ArgumentCaptor.forClass(RatingHistory.class);
        verify(ratingHistoryRepository, times(2)).save(cap.capture());
        List<RatingHistory> histories = cap.getAllValues();

        // Both rated 1500. For rank-1 user: seed=1, delta = round(100*(1-1)/2) = 0.
        // For rank-2 user: seed=1, delta = round(100*(1-2)/2) = -50.
        assertEquals(1, histories.get(0).getRank());
        assertEquals(2, histories.get(1).getRank());
        assertEquals(1500, histories.get(0).getOldRating());
        assertEquals(1500, histories.get(1).getOldRating());
        assertEquals(0, histories.get(0).getRatingChange());
        assertEquals(-50, histories.get(1).getRatingChange());
        assertEquals(1500, histories.get(0).getNewRating());
        assertEquals(1450, histories.get(1).getNewRating());
        assertTrue(c.getRatingProcessed());
    }

    @Test
    void processRatings_HigherRatedUserLoses_DeltaNegative() {
        LocalDateTime endTime = LocalDateTime.of(2026, 5, 25, 12, 0);
        Contest c = contest(3L, endTime);
        User strong = user(10L);
        User weak = user(20L);
        // weak takes rank 1, strong takes rank 2
        List<ContestParticipation> ps = new ArrayList<>(List.of(
                participation(weak, 5, 100),
                participation(strong, 3, 200)));

        when(ratingHistoryRepository.findByContestId(3L)).thenReturn(Collections.emptyList());
        when(participationRepository.findByContestIdWithUserOrderByRankAsc(3L)).thenReturn(ps);
        // strong (id=10) has prior 1700, weak (id=20) has no history → 1500
        when(ratingHistoryRepository
                .findTopByUserIdAndContestEndTimeLessThanOrderByContestEndTimeDescIdDesc(eq(10L), any()))
                .thenReturn(Optional.of(RatingHistory.builder().newRating(1700).build()));
        when(ratingHistoryRepository
                .findTopByUserIdAndContestEndTimeLessThanOrderByContestEndTimeDescIdDesc(eq(20L), any()))
                .thenReturn(Optional.empty());
        when(ratingHistoryRepository
                .findByUserIdAndContestEndTimeGreaterThanOrderByContestEndTimeAscIdAsc(anyLong(), any()))
                .thenReturn(Collections.emptyList());
        when(ratingHistoryRepository.findByUserIdOrderByContestEndTimeAscIdAsc(anyLong()))
                .thenReturn(Collections.emptyList());
        when(userStatisticsRepository.findByUserId(anyLong()))
                .thenReturn(Optional.of(UserStatistics.builder().build()));

        ratingService.processRatings(c);

        ArgumentCaptor<RatingHistory> cap = ArgumentCaptor.forClass(RatingHistory.class);
        verify(ratingHistoryRepository, times(2)).save(cap.capture());
        // weak placed first → rank 1, weak rating 1500, seed = 1 + (1 strong>weak) = 2, delta = 100*(2-1)/2 = 50
        RatingHistory weakRow = cap.getAllValues().get(0);
        assertEquals(50, weakRow.getRatingChange().intValue());
        assertEquals(1550, weakRow.getNewRating().intValue());
        // strong placed second → rank 2, rating 1700, seed = 1 (nobody strictly higher), delta = 100*(1-2)/2 = -50
        RatingHistory strongRow = cap.getAllValues().get(1);
        assertEquals(-50, strongRow.getRatingChange().intValue());
        assertEquals(1650, strongRow.getNewRating().intValue());
    }

    @Test
    void processRatings_Idempotent_WipesPreviousAndReprocesses() {
        LocalDateTime endTime = LocalDateTime.of(2026, 5, 25, 12, 0);
        Contest c = contest(4L, endTime);
        RatingHistory prev = RatingHistory.builder().id(99L).build();
        when(ratingHistoryRepository.findByContestId(4L)).thenReturn(List.of(prev));
        when(participationRepository.findByContestIdOrderByRankAsc(4L)).thenReturn(Collections.emptyList());
        when(participationRepository.findByContestIdWithUserOrderByRankAsc(4L)).thenReturn(Collections.emptyList());

        ratingService.processRatings(c);

        verify(ratingHistoryRepository).deleteAll(List.of(prev));
        verify(ratingHistoryRepository).flush();
    }

    @Test
    void rebuildChainFrom_RespectsEndTimeAscOrder() {
        // Regression: chain rebuild must visit rows in ascending end-time order
        Long userId = 7L;
        LocalDateTime t0 = LocalDateTime.of(2026, 5, 1, 0, 0);

        // anchor row at/before t0
        RatingHistory anchor = RatingHistory.builder().newRating(1500).build();
        // downstream rows (already in asc order from repo)
        RatingHistory r1 = RatingHistory.builder().ratingChange(50).oldRating(0).newRating(0).build();
        RatingHistory r2 = RatingHistory.builder().ratingChange(-20).oldRating(0).newRating(0).build();

        when(ratingHistoryRepository
                .findTopByUserIdAndContestEndTimeLessThanOrderByContestEndTimeDescIdDesc(eq(userId), any()))
                .thenReturn(Optional.of(anchor));
        when(ratingHistoryRepository
                .findByUserIdAndContestEndTimeGreaterThanOrderByContestEndTimeAscIdAsc(eq(userId), eq(t0)))
                .thenReturn(List.of(r1, r2));
        when(ratingHistoryRepository.findByUserIdOrderByContestEndTimeAscIdAsc(userId))
                .thenReturn(List.of(r1, r2));
        when(userStatisticsRepository.findByUserId(userId))
                .thenReturn(Optional.of(UserStatistics.builder().build()));

        ratingService.rebuildChainFrom(userId, t0);

        assertEquals(1500, r1.getOldRating());
        assertEquals(1550, r1.getNewRating());
        assertEquals(1550, r2.getOldRating());
        assertEquals(1530, r2.getNewRating());

        ArgumentCaptor<UserStatistics> statsCap = ArgumentCaptor.forClass(UserStatistics.class);
        verify(userStatisticsRepository).save(statsCap.capture());
        assertEquals(1530, statsCap.getValue().getCurrentRating());
        assertEquals(1550, statsCap.getValue().getMaxRating());
    }
}
