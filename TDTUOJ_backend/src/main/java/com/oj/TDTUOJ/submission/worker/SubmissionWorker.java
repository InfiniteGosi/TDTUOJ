package com.oj.TDTUOJ.submission.worker;

import com.oj.TDTUOJ.submission.dto.SubmissionJobDTO;
import com.oj.TDTUOJ.submission.service.SubmissionJudgeService;
import com.oj.TDTUOJ.submission.service.SubmissionQueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Background worker that drains the Redis judging queue.
 *
 * <p>Submissions are accepted synchronously by the API (saved as PENDING and pushed onto the
 * queue) so the HTTP request can return immediately; the heavy work of compiling and running
 * user code on Judge0 happens here, off the request thread. This decouples submission intake
 * from judging throughput and lets a burst of submissions queue up rather than overwhelming
 * Judge0 or blocking clients.
 *
 * <p>A single scheduled thread pulls one job at a time and hands it to
 * {@link SubmissionJudgeService}, which is where the actual Judge0 execution and
 * verdict resolution live.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubmissionWorker {

    private final SubmissionQueueService submissionQueueService;
    private final SubmissionJudgeService submissionJudgeService;

    /**
     * Polls the queue and judges the next submission, if any.
     *
     * <p>Runs on a fixed 100 ms delay <em>after the previous run finishes</em> (not a fixed
     * rate), so a slow judging pass can never overlap the next one — this method is effectively
     * single-threaded per instance. The dequeue itself blocks up to 5 s (see
     * {@link SubmissionQueueService#dequeue()}), so the loop mostly parks waiting for work
     * rather than busy-spinning; the 100 ms delay only applies between completed judgings.
     */
    @Scheduled(fixedDelay = 100)
    public void poll() {
        // Blocking pop off the Redis queue; null means the queue was empty for the whole
        // 5 s wait, so there is nothing to do this tick — return and let the scheduler retry.
        SubmissionJobDTO job = submissionQueueService.dequeue();
        if (job == null) return;

        log.info("Worker picked up submissionId={}", job.getSubmissionId());
        try {
            // Delegate the full judging pipeline (fetch test cases → run on Judge0 →
            // resolve verdict → update stats/leaderboard). Runs inline on the worker thread.
            submissionJudgeService.judge(job);
        } catch (Exception e) {
            // Never let one bad job kill the scheduled worker. The job has already been popped
            // (at-most-once delivery), so on an unexpected failure here the submission would be
            // left in RUNNING/PENDING; SubmissionJudgeService is responsible for committing a
            // terminal verdict (e.g. IE) so nothing stays stuck. We just log and move on.
            log.error("Failed to judge submissionId={}", job.getSubmissionId(), e);
        }
    }
}