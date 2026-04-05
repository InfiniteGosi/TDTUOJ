package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
import com.oj.TDTUOJ.common.enums.ContestStyle;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.dto.ContestDTO;
import com.oj.TDTUOJ.contest.dto.ContestProblemDTO;
import com.oj.TDTUOJ.contest.dto.LeaderboardDTO;
import com.oj.TDTUOJ.contest.dto.ScoreboardEntryDTO;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestProblem;
import com.oj.TDTUOJ.contest.entity.ContestRegistration;
import com.oj.TDTUOJ.contest.repository.*;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
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

    // ── Read operations ───────────────────────────────────────────────────── //

    @Override
    public Response<Page<ContestDTO>> getPublicContests(int page, int size) {
        if (size <= 0) size = 20;
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "startTime"));
        Page<ContestDTO> dtoPage = contestRepository.findByIsPublicTrue(pageable)
                .map(this::toDTO);
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
        if (dto.getEndTime()           != null) contest.setEndTime(dto.getEndTime());
        if (dto.getIsPublic()          != null) contest.setIsPublic(dto.getIsPublic());
        if (dto.getIsRated()           != null) contest.setIsRated(dto.getIsRated());
        if (dto.getMaxParticipant()    != null) contest.setMaxParticipant(dto.getMaxParticipant());
        if (dto.getRegistrationStart() != null) contest.setRegistrationStart(dto.getRegistrationStart());
        if (dto.getRegistrationEnd()   != null) contest.setRegistrationEnd(dto.getRegistrationEnd());
        if (dto.getContestStyle()      != null) {
            validateContestStyle(dto.getContestStyle());
            contest.setContestStyle(dto.getContestStyle());
        }

        // ── Sync problems if the caller supplied a problems list ──────────── //
        if (dto.getProblems() != null) {
            // orphanRemoval=true will DELETE removed rows automatically
            contest.getContestProblems().clear();
            for (ContestProblemDTO cpDTO : dto.getProblems()) {
                Problem problem = problemRepository.findById(cpDTO.getProblemId())
                        .orElseThrow(() -> new NotFoundException(
                                "Problem not found: " + cpDTO.getProblemId()));
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

        // Cannot register for a contest that has already ended
        if (contest.getEndTime() != null && LocalDateTime.now().isAfter(contest.getEndTime())) {
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
        // Verify contest exists before delegating
        if (!contestRepository.existsById(contestId)) {
            throw new NotFoundException("Contest not found: " + contestId);
        }
        LeaderboardDTO leaderboard = leaderboardService.getLeaderboard(contestId, page, size);
        return ok(leaderboard);
    }

    @Override
    public Response<List<ScoreboardEntryDTO>> getMyRank(Long contestId, int window) {
        if (!contestRepository.existsById(contestId)) {
            throw new NotFoundException("Contest not found: " + contestId);
        }
        User user = userService.getCurrentLoggedInUser();
        List<ScoreboardEntryDTO> neighbours =
                leaderboardService.getNeighbours(contestId, user.getId(), window);
        return ok(neighbours);
    }

    // ── Internal helpers ──────────────────────────────────────────────────── //

    private ContestDTO toDTO(Contest contest) {
        ContestDTO dto = modelMapper.map(contest, ContestDTO.class);
        dto.setCreatorId(contest.getCreator() != null ? contest.getCreator().getId() : null);
        dto.setCreatorUsername(contest.getCreator() != null ? contest.getCreator().getUsername() : null);
        dto.setTotalProblems(contest.getContestProblems().size());
        // Use registrations (sign-ups), not participations (runtime data)
        dto.setTotalParticipants(contest.getRegistrations().size());
        // Attach problem list
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
        return dto;
    }

    private void validateContestStyle(ContestStyle style) {
        if (style != null && style != ContestStyle.ICPC) {
            throw new BadRequestException("Only ICPC style contests are supported");
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
}
