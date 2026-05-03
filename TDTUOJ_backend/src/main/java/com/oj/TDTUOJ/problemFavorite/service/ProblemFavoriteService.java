package com.oj.TDTUOJ.problemFavorite.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problemFavorite.dto.ProblemFavoriteDTO;

import java.util.List;

public interface ProblemFavoriteService {
    /** Returns the favorite problem list of the currently authenticated user. */
    Response<List<ProblemDTO>> getFavoriteProblems();

    /** Toggles the favorite status. Adds if not favorited, removes if already favorited. */
    Response<ProblemFavoriteDTO> toggleFavorite(Long problemId);
}
