package com.oj.TDTUOJ.userStatistics.service;

import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.submission.entity.Submission;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.userStatistics.dto.UserStatisticsDTO;
import com.oj.TDTUOJ.userStatistics.entity.UserStatistics;
import com.oj.TDTUOJ.userStatistics.repository.UserStatisticsRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserStatisticsServiceImpl implements UserStatisticsService {

    private final UserStatisticsRepository statisticsRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final ModelMapper modelMapper;

    /**
     * Returns the existing UserStatistics row for this user, or creates one by
     * backfilling from their existing Submission history. This ensures users who
     * submitted before the statistics feature was introduced never see all-zeroes.
     */
    private UserStatistics getOrCreate(Long userId) {
        return statisticsRepository.findByUserId(userId)
                .orElseGet(() -> backfillFromSubmissions(userId));
    }

    private UserStatistics backfillFromSubmissions(Long userId) {
        List<Submission> all = submissionRepository.findAllByUserId(userId);

        int total    = all.size();
        int accepted = (int) all.stream()
                .filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.AC)
                .count();

        long solved = all.stream()
                .filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.AC
                        && s.getProblem() != null)
                .map(s -> s.getProblem().getId())
                .distinct()
                .count();

        // Award points once per distinct AC'd problem (any mode).
        Map<Long, Integer> firstAcPoints = new LinkedHashMap<>();
        all.stream()
                .filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.AC
                        && s.getProblem() != null)
                .forEach(s -> firstAcPoints.putIfAbsent(
                        s.getProblem().getId(), s.getProblem().getPoint()));
        int totalPoints = firstAcPoints.values().stream().mapToInt(Integer::intValue).sum();

        double rate = total == 0 ? 0.0
                : Math.round((accepted * 100.0 / total) * 10.0) / 10.0;

        return statisticsRepository.save(UserStatistics.builder()
                .userId(userId)
                .totalSubmissions(total)
                .acceptedSubmissions(accepted)
                .problemsSolved((int) solved)
                .totalPoints(totalPoints)
                .acceptanceRate(rate)
                .build());
    }

    @Override
    public void recordSubmission(Long userId, boolean isAccepted, Integer points) {
        UserStatistics stats = getOrCreate(userId);

        stats.setTotalSubmissions(stats.getTotalSubmissions() + 1);

        if (isAccepted && points > 0) {
            stats.setAcceptedSubmissions(stats.getAcceptedSubmissions() + 1);
            stats.setTotalPoints(stats.getTotalPoints() + points);
        } else if (isAccepted) {
            stats.setAcceptedSubmissions(stats.getAcceptedSubmissions() + 1);
        }

        // Recalculate acceptance rate
        double rate = stats.getTotalSubmissions() == 0 ? 0.0
                : (stats.getAcceptedSubmissions() * 100.0) / stats.getTotalSubmissions();
        stats.setAcceptanceRate(Math.round(rate * 10.0) / 10.0);

        statisticsRepository.save(stats);
    }

    @Override
    public void recordProblemSolved(Long userId) {
        UserStatistics stats = getOrCreate(userId);
        stats.setProblemsSolved(stats.getProblemsSolved() + 1);
        statisticsRepository.save(stats);
    }

    @Override
    public Response<UserStatisticsDTO> getStatsByUserId(Long userId) {
        UserStatistics stats = getOrCreate(userId);
        return Response.<UserStatisticsDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Statistics retrieved successfully")
                .data(modelMapper.map(stats, UserStatisticsDTO.class))
                .build();
    }

    @Override
    public Response<UserStatisticsDTO> getStatsByUsername(String username) {
        Long userId = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"))
                .getId();
        return getStatsByUserId(userId);
    }
}
