package com.oj.TDTUOJ.problem.service;

import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.common.response.Response;
import org.springframework.data.domain.Page;


public interface ProblemService {
    Response<ProblemDTO> createProblem(ProblemDTO problemDTO);
    Response<ProblemDTO> updateProblem(ProblemDTO problemDTO);
    Response<ProblemDTO> getProblemById(Long id);
    Response<?> deleteProblem(Long id);
    Response<Page<ProblemDTO>> getAllProblems(Integer limit,
                                              Integer offset,
                                              String sortField,
                                              String direction,
                                              String title);

    Response<ProblemDTO> getProblemBySlug(String slug);
}
