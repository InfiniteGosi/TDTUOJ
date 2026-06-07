package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
import com.oj.TDTUOJ.common.enums.ContestStyle;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.common.utils.ContestLockUtil;
import com.oj.TDTUOJ.contest.dto.*;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestParticipation;
import com.oj.TDTUOJ.contest.entity.ContestProblem;
import com.oj.TDTUOJ.contest.entity.ContestRegistration;
import com.oj.TDTUOJ.contest.repository.*;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import com.oj.TDTUOJ.submission.entity.Submission;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.user.service.UserService;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContestServiceImpl implements ContestService {

    private final ContestRepository              contestRepository;
    private final ContestProblemRepository       contestProblemRepository;
    private final ContestRegistrationRepository  contestRegistrationRepository;
    private final ContestParticipationRepository contestParticipationRepository;
    private final ProblemRepository              problemRepository;
    private final ContestLeaderboardService      leaderboardService;
    private final UserService                    userService;
    private final ModelMapper                    modelMapper;
    private final SubmissionRepository           submissionRepository;
    private final UserRepository                 userRepository;

    // ── Read operations ───────────────────────────────────────────────────── //

    @Override
    public Response<Page<ContestDTO>> getPublicContests(int page, int size, String search) {
        if (size <= 0) size = 20;
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "startTime"));
        Page<Contest> pageEntities = (search != null && !search.isBlank())
                ? contestRepository.findByIsPublicTrueAndNameContainingIgnoreCase(search.trim(), pageable)
                : contestRepository.findByIsPublicTrue(pageable);
        Page<ContestDTO> dtoPage = pageEntities.map(this::toDTO);
        return Response.<Page<ContestDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Contests retrieved successfully")
                .data(dtoPage)
                .build();
    }

    @Override
    public Response<ContestDTO> getContestBySlug(String slug) {
        Contest contest = contestRepository.findBySlug(slug)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + slug));
        return ok(toDTO(contest));
    }

    @Override
    public Response<ContestDTO> getContestById(Long id) {
        Contest contest = contestRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + id));
        return ok(toDTO(contest));
    }

    // ── Write operations ──────────────────────────────────────────────────── //

    @Override
    @Transactional
    public Response<ContestDTO> createContest(ContestDTO dto) {
        validateContestStyle(dto.getContestStyle());

        String slug = slugify(dto.getName());
        if (contestRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        User creator = userService.getCurrentLoggedInUser();

        Contest contest = Contest.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .slug(slug)
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .isPublic(dto.getIsPublic() != null ? dto.getIsPublic() : Boolean.TRUE)
                .isRated(dto.getIsRated()   != null ? dto.getIsRated()  : Boolean.FALSE)
                .freezeDurationMinutes(dto.getFreezeDurationMinutes())
                .maxParticipant(dto.getMaxParticipant())
                .registrationStart(dto.getRegistrationStart())
                .registrationEnd(dto.getRegistrationEnd())
                .contestStyle(dto.getContestStyle() != null
                        ? dto.getContestStyle() : ContestStyle.ICPC)
                .creator(creator)
                .build();

        // Attach problems if provided
        if (dto.getProblems() != null) {
            for (ContestProblemDTO cpDTO : dto.getProblems()) {
                Problem problem = problemRepository.findById(cpDTO.getProblemId())
                        .orElseThrow(() -> new NotFoundException(
                                "Problem not found: " + cpDTO.getProblemId()));
                validateProblemEligibleForContest(problem, creator);
                ContestProblem cp = ContestProblem.builder()
                        .contest(contest)
                        .problem(problem)
                        .problemOrder(cpDTO.getProblemOrder())
                        .points(cpDTO.getPoints() != null ? cpDTO.getPoints() : problem.getPoint())
                        .build();
                contest.getContestProblems().add(cp);
            }
        }

        Contest saved = contestRepository.save(contest);
        log.info("Created contest id={} slug={}", saved.getId(), saved.getSlug());
        return Response.<ContestDTO>builder()
                .statusCode(HttpStatus.CREATED.value())
                .message("Contest created successfully")
                .data(toDTO(saved))
                .build();
    }

    @Override
    @Transactional
    public Response<ContestDTO> updateContest(Long id, ContestDTO dto) {
        Contest contest = contestRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + id));

        // CREATORs may only update contests they own; ADMINs may update any
        User currentUser = userService.getCurrentLoggedInUser();
        if (!hasRole(currentUser, "ADMIN")) {
            assertOwner(contest, currentUser);
        }

        if (dto.getName()              != null) contest.setName(dto.getName());
        if (dto.getDescription()       != null) contest.setDescription(dto.getDescription());
        if (dto.getStartTime()         != null) contest.setStartTime(dto.getStartTime());
        if (dto.getEndTime()           != null) {
            contest.setEndTime(dto.getEndTime());
            contest.setRatingProcessed(false); // re-trigger rating on time change
        }
        if (dto.getIsPublic()          != null) contest.setIsPublic(dto.getIsPublic());
        if (dto.getIsRated()           != null) {
            contest.setIsRated(dto.getIsRated());
            contest.setRatingProcessed(false); // re-trigger rating on rated change
        }
        if (dto.getFreezeDurationMinutes() != null) contest.setFreezeDurationMinutes(dto.getFreezeDurationMinutes());
        if (dto.getMaxParticipant()    != null) contest.setMaxParticipant(dto.getMaxParticipant());
        if (dto.getRegistrationStart() != null) contest.setRegistrationStart(dto.getRegistrationStart());
        if (dto.getRegistrationEnd()   != null) contest.setRegistrationEnd(dto.getRegistrationEnd());
        if (dto.getContestStyle()      != null) {
            validateContestStyle(dto.getContestStyle());
            contest.setContestStyle(dto.getContestStyle());
        }

        // ── Sync problems if the caller supplied a problems list ──────────── //
        if (dto.getProblems() != null) {
            // Problems already attached are exempt from eligibility checks —
            // they legitimately accumulate submissions while the contest runs.
            Set<Long> alreadyAttached = contest.getContestProblems().stream()
                    .map(cp -> cp.getProblem().getId())
                    .collect(Collectors.toSet());
            // orphanRemoval=true will DELETE removed rows automatically
            contest.getContestProblems().clear();
            for (ContestProblemDTO cpDTO : dto.getProblems()) {
                Problem problem = problemRepository.findById(cpDTO.getProblemId())
                        .orElseThrow(() -> new NotFoundException(
                                "Problem not found: " + cpDTO.getProblemId()));
                if (!alreadyAttached.contains(problem.getId())) {
                    validateProblemEligibleForContest(problem, currentUser);
                }
                ContestProblem cp = ContestProblem.builder()
                        .contest(contest)
                        .problem(problem)
                        .problemOrder(cpDTO.getProblemOrder())
                        .points(cpDTO.getPoints() != null ? cpDTO.getPoints() : problem.getPoint())
                        .build();
                contest.getContestProblems().add(cp);
            }
        }

        Contest saved = contestRepository.save(contest);
        return ok(toDTO(saved));
    }

    @Override
    @Transactional
    public Response<Void> deleteContest(Long id) {
        Contest contest = contestRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + id));

        // CREATORs may only delete contests they own; ADMINs may delete any
        User currentUser = userService.getCurrentLoggedInUser();
        if (!hasRole(currentUser, "ADMIN")) {
            assertOwner(contest, currentUser);
        }

        contestRepository.delete(contest);
        return Response.<Void>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Contest deleted successfully")
                .build();
    }

    // ── Registration ──────────────────────────────────────────────────────── //

    @Override
    @Transactional
    public Response<Void> registerForContest(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));
        User user = userService.getCurrentLoggedInUser();

        // Cannot register for a contest that has already started and ended
        LocalDateTime now = LocalDateTime.now();
        if (contest.getStartTime() != null && now.isAfter(contest.getStartTime())
                && contest.getEndTime() != null && now.isAfter(contest.getEndTime())) {
            throw new BadRequestException("Cannot register: contest has already ended");
        }

        if (contestRegistrationRepository.existsByContestIdAndUserId(contestId, user.getId())) {
            throw new BadRequestException("Already registered for this contest");
        }

        if (contest.getMaxParticipant() != null) {
            // Count registrations for THIS contest, not globally
            long registered = contestRegistrationRepository
                    .countByContestId(contestId);
            if (registered >= contest.getMaxParticipant()) {
                throw new BadRequestException("Contest is full");
            }
        }

        ContestRegistration reg = ContestRegistration.builder()
                .user(user)
                .contest(contest)
                .status(ContestRegistrationStatus.APPROVED)
                .build();
        contestRegistrationRepository.save(reg);

        log.info("User {} registered for contest {}", user.getId(), contestId);
        return Response.<Void>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Registered for contest successfully")
                .build();
    }

    // ── Unregistration ─────────────────────────────────────────────────────── //

    @Override
    @Transactional
    public Response<Void> unregisterFromContest(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));
        User user = userService.getCurrentLoggedInUser();

        if (!contestRegistrationRepository.existsByContestIdAndUserId(contestId, user.getId())) {
            throw new BadRequestException("You are not registered for this contest");
        }

        // Only allow unregistering before the contest starts
        if (contest.getStartTime() != null && !LocalDateTime.now().isBefore(contest.getStartTime())) {
            throw new BadRequestException("Cannot unregister: contest has already started");
        }

        contestRegistrationRepository.deleteByContestIdAndUserId(contestId, user.getId());

        log.info("User {} unregistered from contest {}", user.getId(), contestId);
        return Response.<Void>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Unregistered from contest successfully")
                .build();
    }

    // ── Registration status check ─────────────────────────────────────────── //

    @Override
    public Response<Boolean> isRegisteredForContest(Long contestId) {
        if (!contestRepository.existsById(contestId)) {
            throw new NotFoundException("Contest not found: " + contestId);
        }
        User user = userService.getCurrentLoggedInUser();
        boolean registered = contestRegistrationRepository
                .existsByContestIdAndUserId(contestId, user.getId());
        return Response.<Boolean>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Success")
                .data(registered)
                .build();
    }

    // ── Leaderboard ───────────────────────────────────────────────────────── //

    @Override
    public Response<LeaderboardDTO> getLeaderboard(Long contestId, int page, int size) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));
        LeaderboardDTO leaderboard = leaderboardService
                .getLeaderboard(contestId, page, size, isPrivilegedViewer(contest));
        return ok(leaderboard);
    }

    @Override
    public Response<List<ScoreboardEntryDTO>> getMyRank(Long contestId, int window) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));
        User user = userService.getCurrentLoggedInUser();

        // During a scoreboard freeze the neighbours come from the LIVE ZSET —
        // clamp to the caller's own row so others' frozen-window progress
        // doesn't leak. Privileged viewers keep the full window.
        if (ContestLockUtil.isFrozen(contest, LocalDateTime.now())
                && !isPrivilegedViewer(contest)) {
            window = 0;
        }
        List<ScoreboardEntryDTO> neighbours =
                leaderboardService.getNeighbours(contestId, user.getId(), window);
        return ok(neighbours);
    }

    /**
     * ADMIN or contest creator — sees the live board during a scoreboard freeze.
     * The leaderboard endpoint is public, so anonymous viewers resolve to false.
     */
    private boolean isPrivilegedViewer(Contest contest) {
        try {
            User viewer = userService.getCurrentLoggedInUser();
            boolean isAdmin = viewer.getRoles().stream()
                    .anyMatch(r -> r.getName().equalsIgnoreCase("ADMIN"));
            boolean isCreator = contest.getCreator() != null
                    && contest.getCreator().getId().equals(viewer.getId());
            return isAdmin || isCreator;
        } catch (Exception e) {
            return false; // anonymous
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────── //

    private ContestDTO toDTO(Contest contest) {
        ContestDTO dto = modelMapper.map(contest, ContestDTO.class);
        dto.setCreatorId(contest.getCreator() != null ? contest.getCreator().getId() : null);
        dto.setCreatorUsername(contest.getCreator() != null ? contest.getCreator().getUsername() : null);
        dto.setTotalProblems(contest.getContestProblems().size());
        // Use registrations (sign-ups), not participations (runtime data)
        dto.setTotalParticipants(contest.getRegistrations().size());

        // ── Determine whether the caller may see the problem list ────────── //
        boolean canSeeProblems = false;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()
                && !(auth.getPrincipal() instanceof String && "anonymousUser".equals(auth.getPrincipal()))) {
            // Admins and creators always see problems
            boolean isPrivileged = auth.getAuthorities().stream()
                    .anyMatch(a -> "ADMIN".equals(a.getAuthority()) || "CREATOR".equals(a.getAuthority()));
            if (isPrivileged) {
                canSeeProblems = true;
            } else {
                // Participants see problems only if registered AND contest has started
                try {
                    User currentUser = userService.getCurrentLoggedInUser();
                    boolean isRegistered = contestRegistrationRepository
                            .existsByContestIdAndUserId(contest.getId(), currentUser.getId());
                    boolean contestStarted = contest.getStartTime() != null
                            && !LocalDateTime.now().isBefore(contest.getStartTime());
                    canSeeProblems = isRegistered && contestStarted;
                } catch (Exception ignored) {
                    // Not authenticated or user not found — leave canSeeProblems false
                }
            }
        }

        if (canSeeProblems) {
            dto.setProblems(
                    contest.getContestProblems().stream()
                            .map(cp -> {
                                ContestProblemDTO cpDTO = modelMapper.map(cp, ContestProblemDTO.class);
                                if (cp.getProblem() != null) {
                                    cpDTO.setProblemId(cp.getProblem().getId());
                                    cpDTO.setProblemTitle(cp.getProblem().getTitle());
                                    cpDTO.setProblemSlug(cp.getProblem().getSlug());
                                    cpDTO.setProblemDifficulty(cp.getProblem().getProblemDifficulty());
                                }
                                return cpDTO;
                            })
                            .collect(Collectors.toList())
            );
        } else {
            dto.setProblems(null);
        }

        return dto;
    }

    private void validateContestStyle(ContestStyle style) {
        if (style != null && style != ContestStyle.ICPC) {
            throw new BadRequestException("Only ICPC style contests are supported");
        }
    }

    /**
     * Contest-fairness gate: a problem may enter a contest only if it is
     * private, authored by the caller (ADMIN bypasses ownership), and has
     * never been submitted to by anyone except its author.
     * Mirrors ProblemRepository.findContestEligible* — keep in sync.
     */
    private void validateProblemEligibleForContest(Problem problem, User caller) {
        boolean isAdmin = hasRole(caller, "ADMIN");
        Long authorId = problem.getAuthor() != null ? problem.getAuthor().getId() : null;

        if (!isAdmin && (authorId == null || !authorId.equals(caller.getId()))) {
            throw new BadRequestException(
                    "You can only add problems you authored: '" + problem.getTitle() + "'");
        }
        if (Boolean.TRUE.equals(problem.getIsPublic())) {
            throw new BadRequestException(
                    "Contest problems must be private: '" + problem.getTitle()
                    + "'. Public problems may already have solvers.");
        }
        if (submissionRepository.existsByProblemIdAndUserIdNot(
                problem.getId(), authorId != null ? authorId : -1L)) {
            throw new BadRequestException(
                    "Problem '" + problem.getTitle() + "' already has submissions from other users "
                    + "and cannot be used in a contest.");
        }
    }

    /**
     * Returns true if the user has the given role name (exact match, no ROLE_ prefix,
     * matching the convention stored in the {@code roles} table).
     */
    private boolean hasRole(User user, String roleName) {
        return user.getRoles().stream()
                .anyMatch(r -> roleName.equals(r.getName()));
    }

    /**
     * Throws {@link UnauthorizedAccessException} if {@code user} is not the contest creator.
     * Used to enforce CREATOR ownership without elevating to full ADMIN access.
     */
    private void assertOwner(Contest contest, User user) {
        if (contest.getCreator() == null
                || !contest.getCreator().getId().equals(user.getId())) {
            throw new UnauthorizedAccessException(
                    "You are not the creator of this contest");
        }
    }

    /** Produces a URL-safe slug from a display name. */
    private static String slugify(String input) {
        if (input == null) return "contest";
        String normalised = Normalizer.normalize(input, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalised).replaceAll("")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }

    private <T> Response<T> ok(T data) {
        return Response.<T>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
    }

    // ── Admin monitor ────────────────────────────────────────────────────── //

    @Override
    @Transactional(readOnly = true)
    public Response<ContestMonitorDTO> getContestMonitor(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));

        User caller = userService.getCurrentLoggedInUser();
        if (!hasRole(caller, "ADMIN")) {
            assertOwner(contest, caller);
        }

        // Load all submissions for this contest
        List<Submission> submissions = submissionRepository.findByContestId(contestId);

        // Problem stats — group by problemId
        List<ContestProblem> contestProblems =
                contestProblemRepository.findByContestIdOrderByProblemOrderAsc(contestId);

        Map<Long, List<Submission>> byProblem = submissions.stream()
                .filter(s -> s.getProblem() != null)
                .collect(Collectors.groupingBy(s -> s.getProblem().getId()));

        List<ProblemStatsDTO> problemStats = contestProblems.stream().map(cp -> {
            Long pid = cp.getProblem().getId();
            List<Submission> ps = byProblem.getOrDefault(pid, Collections.emptyList());
            int total   = ps.size();
            int ac      = (int) ps.stream().filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.AC).count();
            int wa      = (int) ps.stream().filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.WA).count();
            int tle     = (int) ps.stream().filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.TLE).count();
            int ce      = (int) ps.stream().filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.CE).count();
            int mle     = (int) ps.stream().filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.MLE).count();
            int sf      = (int) ps.stream().filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.SF).count();
            int pending = (int) ps.stream()
                    .filter(s -> s.getSubmissionStatus() != SubmissionStatus.COMPLETED).count();
            double acRate = total == 0 ? 0.0
                    : Math.round(ac * 1000.0 / total) / 10.0;

            return ProblemStatsDTO.builder()
                    .problemId(pid)
                    .problemTitle(cp.getProblem().getTitle())
                    .problemSlug(cp.getProblem().getSlug())
                    .problemOrder(cp.getProblemOrder())
                    .totalSubmissions(total)
                    .acCount(ac).waCount(wa).tleCount(tle)
                    .ceCount(ce).mleCount(mle).sfCount(sf)
                    .pendingCount(pending)
                    .acRate(acRate)
                    .build();
        }).collect(Collectors.toList());

        // Participant stats — group by userId
        // Primary source: participations (user eagerly loaded via JOIN FETCH)
        List<ContestParticipation> participations =
                contestParticipationRepository.findByContestIdWithUserOrderByRankAsc(contestId);
        Map<Long, String> usernameMap = new HashMap<>(participations.stream()
                .collect(Collectors.toMap(
                        p -> p.getUser().getId(),
                        p -> p.getUser().getUsername(),
                        (a, b) -> a)));
        Map<Long, String> profileUrlMap = new HashMap<>(participations.stream()
                .collect(Collectors.toMap(
                        p -> p.getUser().getId(),
                        p -> p.getUser().getProfileUrl() != null ? p.getUser().getProfileUrl() : "",
                        (a, b) -> a)));

        Map<Long, List<Submission>> byUser = submissions.stream()
                .collect(Collectors.groupingBy(Submission::getUserId));

        // Fallback: any userId in submissions but missing from participations
        // (e.g. user submitted but participation record was never created)
        Set<Long> missingUserIds = byUser.keySet().stream()
                .filter(uid -> !usernameMap.containsKey(uid))
                .collect(Collectors.toSet());
        if (!missingUserIds.isEmpty()) {
            userRepository.findAllById(missingUserIds).forEach(u -> {
                usernameMap.put(u.getId(), u.getUsername());
                profileUrlMap.put(u.getId(), u.getProfileUrl() != null ? u.getProfileUrl() : "");
            });
        }

        List<ParticipantStatsDTO> participantStats = byUser.entrySet().stream().map(e -> {
            Long uid = e.getKey();
            List<Submission> us = e.getValue();
            long solved = us.stream()
                    .filter(s -> s.getSubmissionVerdict() == SubmissionVerdict.AC && s.getProblem() != null)
                    .map(s -> s.getProblem().getId())
                    .distinct()
                    .count();
            LocalDateTime lastSub = us.stream()
                    .map(Submission::getSubmissionDate)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);
            return ParticipantStatsDTO.builder()
                    .userId(uid)
                    .username(usernameMap.getOrDefault(uid, "user#" + uid))
                    .profileUrl(profileUrlMap.get(uid))
                    .totalSubmissions(us.size())
                    .problemsSolved((int) solved)
                    .lastSubmissionTime(lastSub)
                    .build();
        }).sorted(Comparator.comparing(
                p -> p.getLastSubmissionTime() == null ? LocalDateTime.MIN : p.getLastSubmissionTime(),
                Comparator.reverseOrder()
        )).collect(Collectors.toList());

        // totalRegistered = approved registrations in contest_registrations
        // totalActiveParticipants = distinct users who actually submitted
        // These two may differ when users submit without going through registration
        // (e.g. CREATOR role). Use participantStats.size() as the single source of truth
        // for the participant list length so both numbers are consistent.
        long registrantCount = contestRegistrationRepository.countByContestId(contestId);
        int activeCount = byUser.size(); // = participantStats.size()
        int pendingCount = (int) submissions.stream()
                .filter(s -> s.getSubmissionStatus() != SubmissionStatus.COMPLETED).count();

        return ok(ContestMonitorDTO.builder()
                .contestId(contestId)
                .contestName(contest.getName())
                .contestSlug(contest.getSlug())
                .startTime(contest.getStartTime())
                .endTime(contest.getEndTime())
                .totalRegistered((int) registrantCount)
                .totalActiveParticipants(activeCount)
                .totalSubmissions(submissions.size())
                .pendingSubmissions(pendingCount)
                .problemStats(problemStats)
                .participantStats(participantStats)
                .lastUpdated(LocalDateTime.now())
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public Response<List<SubmissionDTO>> getParticipantSubmissions(
            Long contestId, Long userId, Long problemId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new NotFoundException("Contest not found: " + contestId));

        User caller = userService.getCurrentLoggedInUser();
        if (!hasRole(caller, "ADMIN")) {
            assertOwner(contest, caller);
        }

        List<Submission> submissions = (problemId != null)
                ? submissionRepository.findByContestIdAndUserIdAndProblemIdOrderBySubmissionDateDesc(
                        contestId, userId, problemId)
                : submissionRepository.findByContestIdAndUserIdOrderBySubmissionDateDesc(
                        contestId, userId);

        List<SubmissionDTO> dtos = submissions.stream().map(s -> {
            SubmissionDTO dto = modelMapper.map(s, SubmissionDTO.class);
            dto.setProblemId(s.getProblem() != null ? s.getProblem().getId() : null);
            return dto;
        }).collect(Collectors.toList());

        return ok(dtos);
    }
}
