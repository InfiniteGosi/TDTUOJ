package com.oj.TDTUOJ.contest.service;

import com.oj.TDTUOJ.common.enums.ContestStyle;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.dto.ContestDTO;
import com.oj.TDTUOJ.contest.dto.ContestMonitorDTO;
import com.oj.TDTUOJ.contest.dto.ContestProblemDTO;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestProblem;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.contest.repository.ContestParticipationRepository;
import com.oj.TDTUOJ.contest.repository.ContestProblemRepository;
import com.oj.TDTUOJ.contest.repository.ContestRegistrationRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.user.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContestServiceImplTest {
    @Mock private ContestRepository contestRepository;
    @Mock private ContestProblemRepository contestProblemRepository;
    @Mock private ContestRegistrationRepository contestRegistrationRepository;
    @Mock private ContestParticipationRepository contestParticipationRepository;
    @Mock private ProblemRepository problemRepository;
    @Mock private ContestLeaderboardService leaderboardService;
    @Mock private UserService userService;
    @Mock private ModelMapper modelMapper;
    @Mock private SubmissionRepository submissionRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private ContestServiceImpl contestService;

    @BeforeEach
    void clearSecurity() { SecurityContextHolder.clearContext(); }

    @AfterEach
    void cleanupSecurity() { SecurityContextHolder.clearContext(); }

    private User user(Long id, String... roles) {
        User u = new User();
        u.setId(id);
        u.setUsername("u" + id);
        Set<Role> rset = new HashSet<>();
        for (String r : roles) {
            Role role = new Role();
            role.setName(r);
            rset.add(role);
        }
        u.setRoles(rset);
        return u;
    }

    private Contest baseContest(Long id, User creator) {
        Contest c = Contest.builder()
                .id(id)
                .name("Spring Round")
                .slug("spring-round")
                .contestStyle(ContestStyle.ICPC)
                .startTime(LocalDateTime.now().plusDays(1))
                .endTime(LocalDateTime.now().plusDays(2))
                .creator(creator)
                .isPublic(true)
                .isRated(false)
                .contestProblems(new ArrayList<>())
                .registrations(new ArrayList<>())
                .participations(new ArrayList<>())
                .build();
        return c;
    }

    @Test
    void createContest_GeneratesSlug() {
        // given
        ContestDTO dto = new ContestDTO();
        dto.setName("Spring Round");
        dto.setContestStyle(ContestStyle.ICPC);

        User creator = user(1L, "CREATOR");
        when(userService.getCurrentLoggedInUser()).thenReturn(creator);
        when(contestRepository.existsBySlug("spring-round")).thenReturn(false);
        when(contestRepository.save(any(Contest.class))).thenAnswer(inv -> {
            Contest c = inv.getArgument(0);
            c.setId(7L);
            return c;
        });
        when(modelMapper.map(any(Contest.class), eq(ContestDTO.class))).thenReturn(new ContestDTO());

        // when
        Response<ContestDTO> resp = contestService.createContest(dto);

        // then
        assertEquals(HttpStatus.CREATED.value(), resp.getStatusCode());
        ArgumentCaptor<Contest> cap = ArgumentCaptor.forClass(Contest.class);
        verify(contestRepository).save(cap.capture());
        assertEquals("spring-round", cap.getValue().getSlug());
        assertEquals(ContestStyle.ICPC, cap.getValue().getContestStyle());
        assertEquals(creator, cap.getValue().getCreator());
    }

    @Test
    void createContest_DuplicateSlug_Disambiguated() {
        ContestDTO dto = new ContestDTO();
        dto.setName("Spring Round");
        User creator = user(1L, "CREATOR");
        when(userService.getCurrentLoggedInUser()).thenReturn(creator);
        when(contestRepository.existsBySlug("spring-round")).thenReturn(true);
        when(contestRepository.save(any(Contest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(modelMapper.map(any(Contest.class), eq(ContestDTO.class))).thenReturn(new ContestDTO());

        contestService.createContest(dto);

        ArgumentCaptor<Contest> cap = ArgumentCaptor.forClass(Contest.class);
        verify(contestRepository).save(cap.capture());
        assertTrue(cap.getValue().getSlug().startsWith("spring-round-"));
        assertNotEquals("spring-round", cap.getValue().getSlug());
    }

    @Test
    void createContest_NonIcpc_ThrowsBadRequest() {
        ContestDTO dto = new ContestDTO();
        dto.setName("X");
        dto.setContestStyle(ContestStyle.IOI);
        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> contestService.createContest(dto));
        assertEquals("Only ICPC style contests are supported", ex.getMessage());
        verify(contestRepository, never()).save(any());
    }

    @Test
    void registerForContest_Success() {
        Contest c = baseContest(50L, user(99L, "CREATOR"));
        User u = user(5L, "PARTICIPANT");
        when(contestRepository.findById(50L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(contestRegistrationRepository.existsByContestIdAndUserId(50L, 5L)).thenReturn(false);

        Response<Void> resp = contestService.registerForContest(50L);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        verify(contestRegistrationRepository).save(any());
    }

    @Test
    void registerForContest_AlreadyRegistered_Throws() {
        Contest c = baseContest(50L, user(99L, "CREATOR"));
        User u = user(5L, "PARTICIPANT");
        when(contestRepository.findById(50L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(contestRegistrationRepository.existsByContestIdAndUserId(50L, 5L)).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> contestService.registerForContest(50L));
        assertEquals("Already registered for this contest", ex.getMessage());
        verify(contestRegistrationRepository, never()).save(any());
    }

    @Test
    void registerForContest_ContestEnded_Throws() {
        Contest c = baseContest(50L, user(99L, "CREATOR"));
        c.setStartTime(LocalDateTime.now().minusDays(2));
        c.setEndTime(LocalDateTime.now().minusDays(1));
        User u = user(5L, "PARTICIPANT");
        when(contestRepository.findById(50L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(u);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> contestService.registerForContest(50L));
        assertTrue(ex.getMessage().contains("already ended"));
    }

    @Test
    void registerForContest_Full_Throws() {
        Contest c = baseContest(50L, user(99L, "CREATOR"));
        c.setMaxParticipant(10);
        User u = user(5L, "PARTICIPANT");
        when(contestRepository.findById(50L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(contestRegistrationRepository.existsByContestIdAndUserId(50L, 5L)).thenReturn(false);
        when(contestRegistrationRepository.countByContestId(50L)).thenReturn(10L);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> contestService.registerForContest(50L));
        assertEquals("Contest is full", ex.getMessage());
    }

    @Test
    void updateContest_NotOwner_ThrowsUnauthorized() {
        User creator = user(99L, "CREATOR");
        User other = user(5L, "CREATOR");
        Contest c = baseContest(1L, creator);
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(other);

        assertThrows(UnauthorizedAccessException.class,
                () -> contestService.updateContest(1L, new ContestDTO()));
        verify(contestRepository, never()).save(any());
    }

    @Test
    void deleteContest_OwnerOnly() {
        User creator = user(7L, "CREATOR");
        Contest c = baseContest(1L, creator);
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(creator);

        Response<Void> resp = contestService.deleteContest(1L);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        verify(contestRepository).delete(c);
    }

    @Test
    void deleteContest_AdminAllowedOnAnyContest() {
        User creator = user(7L, "CREATOR");
        User admin = user(1L, "ADMIN");
        Contest c = baseContest(1L, creator);
        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(admin);

        contestService.deleteContest(1L);
        verify(contestRepository).delete(c);
    }

    @Test
    void getContestMonitor_PopulatesStartEndTime() {
        // Regression: monitor DTO must echo contest start/end times
        User admin = user(1L, "ADMIN");
        Contest c = baseContest(50L, admin);
        c.setStartTime(LocalDateTime.of(2026, 5, 23, 9, 0));
        c.setEndTime(LocalDateTime.of(2026, 5, 23, 12, 0));

        when(contestRepository.findById(50L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(admin);
        when(submissionRepository.findByContestId(50L)).thenReturn(Collections.emptyList());
        when(contestProblemRepository.findByContestIdOrderByProblemOrderAsc(50L))
                .thenReturn(Collections.emptyList());
        when(contestParticipationRepository.findByContestIdWithUserOrderByRankAsc(50L))
                .thenReturn(Collections.emptyList());
        when(contestRegistrationRepository.countByContestId(50L)).thenReturn(0L);

        Response<ContestMonitorDTO> resp = contestService.getContestMonitor(50L);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals(LocalDateTime.of(2026, 5, 23, 9, 0), resp.getData().getStartTime());
        assertEquals(LocalDateTime.of(2026, 5, 23, 12, 0), resp.getData().getEndTime());
        assertEquals("Spring Round", resp.getData().getContestName());
    }

    @Test
    void getContestBySlug_NotFound_Throws() {
        when(contestRepository.findBySlug("missing")).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> contestService.getContestBySlug("missing"));
    }

    // ── Contest-problem eligibility validation ─────────────────────────────

    private Problem problem(Long id, Long authorId, boolean isPublic) {
        User author = null;
        if (authorId != null) { author = new User(); author.setId(authorId); }
        return Problem.builder().id(id).title("P" + id).isPublic(isPublic).author(author).point(100).build();
    }

    private ContestDTO dtoWithProblems(Long... problemIds) {
        ContestDTO dto = new ContestDTO();
        dto.setName("Spring Round");
        dto.setContestStyle(ContestStyle.ICPC);
        List<ContestProblemDTO> cps = new ArrayList<>();
        int order = 1;
        for (Long pid : problemIds) {
            ContestProblemDTO cp = new ContestProblemDTO();
            cp.setProblemId(pid);
            cp.setProblemOrder(order++);
            cp.setPoints(100);
            cps.add(cp);
        }
        dto.setProblems(cps);
        return dto;
    }

    @Test
    void createContest_publicProblem_rejected() {
        User creator = user(1L, "CREATOR");
        when(userService.getCurrentLoggedInUser()).thenReturn(creator);
        when(contestRepository.existsBySlug("spring-round")).thenReturn(false);
        when(problemRepository.findById(10L)).thenReturn(Optional.of(problem(10L, 1L, true)));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> contestService.createContest(dtoWithProblems(10L)));
        assertTrue(ex.getMessage().contains("must be private"));
        verify(contestRepository, never()).save(any());
    }

    @Test
    void createContest_problemNotOwnedByCreator_rejected() {
        User creator = user(1L, "CREATOR");
        when(userService.getCurrentLoggedInUser()).thenReturn(creator);
        when(contestRepository.existsBySlug("spring-round")).thenReturn(false);
        when(problemRepository.findById(10L)).thenReturn(Optional.of(problem(10L, 2L, false)));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> contestService.createContest(dtoWithProblems(10L)));
        assertTrue(ex.getMessage().contains("problems you authored"));
        verify(contestRepository, never()).save(any());
    }

    @Test
    void createContest_problemWithForeignSubmissions_rejected() {
        User creator = user(1L, "CREATOR");
        when(userService.getCurrentLoggedInUser()).thenReturn(creator);
        when(contestRepository.existsBySlug("spring-round")).thenReturn(false);
        when(problemRepository.findById(10L)).thenReturn(Optional.of(problem(10L, 1L, false)));
        when(submissionRepository.existsByProblemIdAndUserIdNot(10L, 1L)).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> contestService.createContest(dtoWithProblems(10L)));
        assertTrue(ex.getMessage().contains("already has submissions"));
        verify(contestRepository, never()).save(any());
    }

    @Test
    void createContest_adminAttachingOthersPrivateProblem_succeeds() {
        User admin = user(1L, "ADMIN");
        when(userService.getCurrentLoggedInUser()).thenReturn(admin);
        when(contestRepository.existsBySlug("spring-round")).thenReturn(false);
        when(problemRepository.findById(10L)).thenReturn(Optional.of(problem(10L, 2L, false)));
        when(submissionRepository.existsByProblemIdAndUserIdNot(10L, 2L)).thenReturn(false);
        when(contestRepository.save(any(Contest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(modelMapper.map(any(Contest.class), eq(ContestDTO.class))).thenReturn(new ContestDTO());

        Response<ContestDTO> resp = contestService.createContest(dtoWithProblems(10L));
        assertEquals(HttpStatus.CREATED.value(), resp.getStatusCode());
    }

    @Test
    void updateContest_existingAttachedProblem_skipsValidation() {
        User creator = user(1L, "CREATOR");
        Contest c = baseContest(1L, creator);
        // Already-attached problem — now PUBLIC with foreign submissions; must be exempt
        Problem attached = problem(5L, 1L, true);
        c.getContestProblems().add(ContestProblem.builder()
                .contest(c).problem(attached).problemOrder(1).points(100).build());

        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(creator);
        when(problemRepository.findById(5L)).thenReturn(Optional.of(attached));
        when(contestRepository.save(any(Contest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(modelMapper.map(any(Contest.class), eq(ContestDTO.class))).thenReturn(new ContestDTO());

        ContestDTO dto = new ContestDTO();
        dto.setProblems(dtoWithProblems(5L).getProblems());

        Response<ContestDTO> resp = contestService.updateContest(1L, dto);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        verify(submissionRepository, never()).existsByProblemIdAndUserIdNot(anyLong(), anyLong());
    }

    @Test
    void updateContest_newlyAddedSolvedProblem_rejected() {
        User creator = user(1L, "CREATOR");
        Contest c = baseContest(1L, creator);
        Problem attached = problem(5L, 1L, false);
        c.getContestProblems().add(ContestProblem.builder()
                .contest(c).problem(attached).problemOrder(1).points(100).build());

        when(contestRepository.findById(1L)).thenReturn(Optional.of(c));
        when(userService.getCurrentLoggedInUser()).thenReturn(creator);
        when(problemRepository.findById(5L)).thenReturn(Optional.of(attached));
        Problem newcomer = problem(6L, 1L, false);
        when(problemRepository.findById(6L)).thenReturn(Optional.of(newcomer));
        when(submissionRepository.existsByProblemIdAndUserIdNot(6L, 1L)).thenReturn(true);

        ContestDTO dto = new ContestDTO();
        dto.setProblems(dtoWithProblems(5L, 6L).getProblems());

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> contestService.updateContest(1L, dto));
        assertTrue(ex.getMessage().contains("already has submissions"));
        verify(contestRepository, never()).save(any());
    }

}
