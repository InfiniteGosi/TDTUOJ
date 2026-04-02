package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.dto.ContestDTO;
import com.oj.TDTUOJ.contest.dto.LeaderboardDTO;
import com.oj.TDTUOJ.contest.dto.ScoreboardEntryDTO;
import org.springframework.data.domain.Page;

import java.util.List;

public interface ContestService {

    Response<Page<ContestDTO>> getPublicContests(int page, int size);

    Response<ContestDTO> getContestBySlug(String slug);

    Response<ContestDTO> getContestById(Long id);

    Response<ContestDTO> createContest(ContestDTO dto);

    Response<ContestDTO> updateContest(Long id, ContestDTO dto);

    Response<Void> deleteContest(Long id);

    /** Register the currently authenticated user for a contest. */
    Response<Void> registerForContest(Long contestId);

    /** Return the full ICPC leaderboard (paginated). */
    Response<LeaderboardDTO> getLeaderboard(Long contestId, int page, int size);

    /** Return the calling user's rank and neighbours. */
    Response<List<ScoreboardEntryDTO>> getMyRank(Long contestId, int window);
}
