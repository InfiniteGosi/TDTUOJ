package com.oj.TDTUOJ.submission.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.submission.dto.SubmissionAnalysisResult;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import org.springframework.data.domain.Page;

public interface SubmissionService {
    Response<SubmissionDTO> createSubmission(SubmissionDTO submissionDTO);

    Response<Page<SubmissionDTO>> getMySubmissions(Integer limit,
                                                   Integer offset,
                                                   Long problemId);

    Response<SubmissionDTO> getSubmissionStatus(Long id);

    Response<Long> getTotalSubmissionsCount();

    Response<SubmissionAnalysisResult> getSubmissionAnalysis(Long id);
}
