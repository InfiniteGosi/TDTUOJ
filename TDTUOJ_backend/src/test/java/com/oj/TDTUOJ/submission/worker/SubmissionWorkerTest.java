package com.oj.TDTUOJ.submission.worker;

import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
import com.oj.TDTUOJ.submission.service.SubmissionJudgeService;
import com.oj.TDTUOJ.submission.service.SubmissionQueueService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionWorkerTest {
    @Mock private SubmissionQueueService submissionQueueService;
    @Mock private SubmissionJudgeService submissionJudgeService;

    @InjectMocks private SubmissionWorker worker;

    @Test
    void poll_NoJob_NoDelegation() {
        when(submissionQueueService.dequeue()).thenReturn(null);
        worker.poll();
        verify(submissionJudgeService, never()).judge(any());
    }

    @Test
    void poll_WithJob_DelegatesToJudgeService() {
        SubmissionJobDTO job = SubmissionJobDTO.builder().submissionId(1L).build();
        when(submissionQueueService.dequeue()).thenReturn(job);
        worker.poll();
        verify(submissionJudgeService).judge(job);
    }

    @Test
    void poll_JudgeThrows_SwallowsAndLogs() {
        SubmissionJobDTO job = SubmissionJobDTO.builder().submissionId(2L).build();
        when(submissionQueueService.dequeue()).thenReturn(job);
        doThrow(new RuntimeException("boom")).when(submissionJudgeService).judge(job);
        // when + then — must not propagate
        worker.poll();
        verify(submissionJudgeService).judge(job);
    }
}
