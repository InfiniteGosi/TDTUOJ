package com.oj.TDTUOJ.problem.service;

import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.common.response.Response;
import org.springframework.data.domain.Page;

import java.util.List;


public interface ProblemService {

    Response<Page<ProblemDTO>> getAllProblems(Integer limit, Integer offset, String sortField,
                                              String direction, String title, List<String> tagNames,
                                              String difficulty);

    Response<ProblemDTO> getProblemById(Long id);

    Response<ProblemDTO> getProblemBySlug(String slug);

    Response<ProblemDTO> createProblem(ProblemDTO problemDTO);

    Response<ProblemDTO> updateProblem(ProblemDTO problemDTO);

    Response<ProblemDTO> updateProblemTags(Long problemId, ProblemDTO problemDTO);

    Response<?> deleteProblem(Long id);

    /** Lecturer's problem repository — returns problems authored by current user. */
    Response<Page<ProblemDTO>> getMyProblems(int page, int size, String search);

    /** Problems usable in a contest: private + zero non-author submissions. */
    Response<Page<ProblemDTO>> getContestEligibleProblems(int page, int size, String search);
}

