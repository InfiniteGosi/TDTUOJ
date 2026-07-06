package com.oj.TDTUOJ.submission.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.submission.dto.SubmissionAnalysisResult;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import org.springframework.data.domain.Page;

/**
 * Application-facing submission operations: accepting a new submission (validation + enqueue),
 * polling its status, listing the caller's submissions, and producing an AI analysis. Judging
 * itself is asynchronous and lives in {@link SubmissionJudgeService}, not here.
 */
public interface SubmissionService {
    /** Validates (cooldown, contest registration, lab deadline), persists PENDING, and enqueues for judging. */
    Response<SubmissionDTO> createSubmission(SubmissionDTO submissionDTO);

    /** Paginated list of the current user's submissions, optionally filtered to one problem. */
    Response<Page<SubmissionDTO>> getMySubmissions(Integer limit,
                                                   Integer offset,
                                                   Long problemId);

    /** Current status/verdict of a submission (with queue position while still PENDING); hides locked-contest rows from non-owners. */
    Response<SubmissionDTO> getSubmissionStatus(Long id);

    /** Platform-wide total submission count (admin/dashboard). */
    Response<Long> getTotalSubmissionsCount();

    /** Generates (or returns cached) LeetCode-style AI analysis for an Accepted submission. */
    Response<SubmissionAnalysisResult> getSubmissionAnalysis(Long id);
}
