package com.oj.TDTUOJ.submission.worker;

import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
import com.oj.TDTUOJ.submission.service.SubmissionJudgeService;
import com.oj.TDTUOJ.submission.service.SubmissionQueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubmissionWorker {

    private final SubmissionQueueService submissionQueueService;
    private final SubmissionJudgeService submissionJudgeService;

    @Scheduled(fixedDelay = 100)
    public void poll() {
        SubmissionJobDTO job = submissionQueueService.dequeue();
        if (job == null) return;

        log.info("Worker picked up submissionId={}", job.getSubmissionId());
        try {
            submissionJudgeService.judge(job);
        } catch (Exception e) {
            log.error("Failed to judge submissionId={}", job.getSubmissionId(), e);
        }
    }
}