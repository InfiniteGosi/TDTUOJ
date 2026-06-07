package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestProblem;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContestProblemPublishServiceTest {

    @Mock private ContestRepository contestRepository;
    @Mock private ProblemRepository problemRepository;

    @InjectMocks private ContestProblemPublishService publishService;

    private Problem problem(Long id, boolean isPublic) {
        return Problem.builder().id(id).title("P" + id).isPublic(isPublic).build();
    }

    private Contest endedContest(Long id, Problem... problems) {
        Contest c = Contest.builder()
                .id(id)
                .name("Ended Round")
                .slug("ended-round")
                .startTime(LocalDateTime.now().minusHours(3))
                .endTime(LocalDateTime.now().minusHours(1))
                .problemsPublished(false)
                .contestProblems(new ArrayList<>())
                .build();
        int order = 1;
        for (Problem p : problems) {
            c.getContestProblems().add(ContestProblem.builder()
                    .contest(c).problem(p).problemOrder(order++).points(100).build());
        }
        return c;
    }

    @Test
    void publish_flipsPrivateProblemsAndSetsFlag() {
        Problem p1 = problem(10L, false);
        Problem p2 = problem(11L, false);
        Contest c = endedContest(1L, p1, p2);
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));

        publishService.publishContestProblems(1L);

        assertTrue(p1.getIsPublic());
        assertTrue(p2.getIsPublic());
        assertTrue(c.getProblemsPublished());
        verify(problemRepository, times(2)).save(any(Problem.class));
        verify(contestRepository).save(c);
    }

    @Test
    void publish_alreadyPublicProblem_idempotent() {
        Problem p1 = problem(10L, true); // pre-feature public problem
        Contest c = endedContest(1L, p1);
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));

        publishService.publishContestProblems(1L);

        assertTrue(c.getProblemsPublished());
        verify(problemRepository, never()).save(any(Problem.class)); // nothing to flip
        verify(contestRepository).save(c);
    }

    @Test
    void publish_contestDeletedBetweenScanAndPublish_noop() {
        when(contestRepository.findById(99L)).thenReturn(Optional.empty());

        publishService.publishContestProblems(99L);

        verify(problemRepository, never()).save(any());
        verify(contestRepository, never()).save(any());
    }

    @Test
    void publish_emptyProblemList_stillSetsFlag() {
        Contest c = endedContest(1L);
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));

        publishService.publishContestProblems(1L);

        assertTrue(c.getProblemsPublished());
        verify(contestRepository).save(c);
    }

    @Test
    void findDueContests_delegatesToRepository() {
        LocalDateTime now = LocalDateTime.now();
        when(contestRepository.findEndedWithUnpublishedProblems(now))
                .thenReturn(java.util.List.of());

        assertTrue(publishService.findDueContests(now).isEmpty());
        verify(contestRepository).findEndedWithUnpublishedProblems(now);
    }
}
