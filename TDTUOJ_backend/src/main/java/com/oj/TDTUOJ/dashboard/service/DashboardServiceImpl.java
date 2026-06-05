package com.oj.TDTUOJ.dashboard.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.dashboard.dto.DashboardStatsDTO;
import com.oj.TDTUOJ.organization.repository.OrganizationRepository;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.userStatistics.entity.UserStatistics;
import com.oj.TDTUOJ.userStatistics.repository.UserStatisticsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final int USER_MONTHS_WINDOW = 12;
    private static final int SUBMISSION_DAYS_WINDOW = 30;
    private static final int TOP_TAGS_LIMIT = 10;

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;
    private final ContestRepository contestRepository;
    private final OrganizationRepository organizationRepository;
    private final UserStatisticsRepository userStatisticsRepository;

    @Override
    public Response<DashboardStatsDTO> getDashboardStats() {
        DashboardStatsDTO dto = DashboardStatsDTO.builder()
                .totals(buildTotals())
                .problemsByDifficulty(toNameCounts(problemRepository.countGroupedByDifficulty()))
                .problemsByTag(toNameCounts(problemRepository.countGroupedByTag(
                        PageRequest.of(0, TOP_TAGS_LIMIT))))
                .usersOverTime(buildUsersOverTime())
                .submissionsOverTime(buildSubmissionsOverTime())
                .verdictDistribution(toNameCounts(submissionRepository.countGroupedByVerdict()))
                .topSolvers(buildTopSolvers())
                .build();

        return Response.<DashboardStatsDTO>builder()
                .statusCode(200)
                .message("Dashboard statistics retrieved successfully")
                .data(dto)
                .build();
    }

    private DashboardStatsDTO.Totals buildTotals() {
        return DashboardStatsDTO.Totals.builder()
                .problems(problemRepository.count())
                .users(userRepository.count())
                .submissions(submissionRepository.count())
                .contests(contestRepository.count())
                .organizations(organizationRepository.count())
                .build();
    }

    /** Maps raw (Object label, Long count) rows into NameCount, stringifying enums. */
    private List<DashboardStatsDTO.NameCount> toNameCounts(List<Object[]> rows) {
        return rows.stream()
                .map(row -> DashboardStatsDTO.NameCount.builder()
                        .name(row[0] == null ? "UNKNOWN" : row[0].toString())
                        .value(((Number) row[1]).longValue())
                        .build())
                .collect(Collectors.toList());
    }

    /** Monthly registrations for the last 12 months, gap-filled, with a running cumulative total. */
    private List<DashboardStatsDTO.TimePoint> buildUsersOverTime() {
        YearMonth startMonth = YearMonth.now().minusMonths(USER_MONTHS_WINDOW - 1);
        LocalDateTime since = startMonth.atDay(1).atStartOfDay();

        Map<String, Long> byMonth = toPeriodMap(userRepository.countRegistrationsByMonth(since));
        long cumulative = userRepository.countByCreatedAtBefore(since);

        List<DashboardStatsDTO.TimePoint> points = new ArrayList<>();
        for (int i = 0; i < USER_MONTHS_WINDOW; i++) {
            String period = startMonth.plusMonths(i).format(MONTH_FMT);
            long count = byMonth.getOrDefault(period, 0L);
            cumulative += count;
            points.add(DashboardStatsDTO.TimePoint.builder()
                    .period(period)
                    .count(count)
                    .cumulative(cumulative)
                    .build());
        }
        return points;
    }

    /** Daily submissions for the last 30 days, gap-filled. */
    private List<DashboardStatsDTO.TimePoint> buildSubmissionsOverTime() {
        LocalDate startDay = LocalDate.now().minusDays(SUBMISSION_DAYS_WINDOW - 1);
        LocalDateTime since = startDay.atStartOfDay();

        Map<String, Long> byDay = toPeriodMap(submissionRepository.countSubmissionsByDay(since));

        List<DashboardStatsDTO.TimePoint> points = new ArrayList<>();
        for (int i = 0; i < SUBMISSION_DAYS_WINDOW; i++) {
            String period = startDay.plusDays(i).format(DAY_FMT);
            points.add(DashboardStatsDTO.TimePoint.builder()
                    .period(period)
                    .count(byDay.getOrDefault(period, 0L))
                    .build());
        }
        return points;
    }

    private Map<String, Long> toPeriodMap(List<Object[]> rows) {
        Map<String, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            if (row[0] != null) {
                map.put(row[0].toString(), ((Number) row[1]).longValue());
            }
        }
        return map;
    }

    /** Top-10 solvers from UserStatistics, joined to User for username/avatar. */
    private List<DashboardStatsDTO.TopSolverDTO> buildTopSolvers() {
        List<UserStatistics> top = userStatisticsRepository
                .findTop10ByOrderByProblemsSolvedDescAcceptedSubmissionsDesc();

        List<Long> userIds = top.stream().map(UserStatistics::getUserId).toList();
        Map<Long, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return top.stream()
                .map(stats -> {
                    User user = usersById.get(stats.getUserId());
                    return DashboardStatsDTO.TopSolverDTO.builder()
                            .userId(stats.getUserId())
                            .username(user != null ? user.getUsername() : "unknown")
                            .name(user != null ? user.getName() : null)
                            .profileUrl(user != null ? user.getProfileUrl() : null)
                            .problemsSolved(stats.getProblemsSolved())
                            .acceptanceRate(stats.getAcceptanceRate())
                            .currentRating(stats.getCurrentRating())
                            .build();
                })
                .collect(Collectors.toList());
    }
}
