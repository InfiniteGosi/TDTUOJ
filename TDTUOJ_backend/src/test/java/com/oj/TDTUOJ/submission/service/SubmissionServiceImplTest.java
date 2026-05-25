package com.oj.TDTUOJ.submission.service;

import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
import com.oj.TDTUOJ.common.enums.SubmissionLanguage;
import com.oj.TDTUOJ.common.enums.SubmissionStatus;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.repository.ContestRegistrationRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.lab.repository.LabRepository;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.submission.dto.SubmissionDTO;
import com.oj.TDTUOJ.submission.entity.Submission;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionServiceImplTest {
    @Mock private SubmissionRepository submissionRepository;
    @Mock private UserService userService;
    @Mock private ModelMapper modelMapper;
    @Mock private ProblemRepository problemRepository;
    @Mock private SubmissionQueueService submissionQueueService;
    @Mock private LabRepository labRepository;
    @Mock private ContestRepository contestRepository;
    @Mock private ContestRegistrationRepository contestRegistrationRepository;

    @InjectMocks private SubmissionServiceImpl submissionService;

    private User user(Long id, String roleName) {
        User u = new User();
        u.setId(id);
        Role r = new Role();
        r.setName(roleName);
        Set<Role> roles = new HashSet<>();
        roles.add(r);
        u.setRoles(roles);
        return u;
    }

    private SubmissionDTO baseDto() {
        SubmissionDTO d = new SubmissionDTO();
        d.setProblemId(10L);
        d.setSourceCode("print(1)");
        d.setSubmissionLanguage(SubmissionLanguage.PYTHON);
        d.setIsPublic(true);
        return d;
    }

    @Test
    void createSubmission_Success_EnqueuesAndReturnsPending() {
        // given
        User u = user(1L, "PARTICIPANT");
        SubmissionDTO dto = baseDto();
        Problem p = new Problem();
        p.setId(10L);

        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(submissionQueueService.isOnCooldown(1L)).thenReturn(false);
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(submissionRepository.save(any(Submission.class))).thenAnswer(inv -> {
            Submission s = inv.getArgument(0);
            s.setId(100L);
            return s;
        });
        when(modelMapper.map(any(Submission.class), eq(SubmissionDTO.class)))
                .thenAnswer(inv -> {
                    SubmissionDTO r = new SubmissionDTO();
                    r.setId(100L);
                    r.setSubmissionStatus(SubmissionStatus.PENDING);
                    return r;
                });
        when(submissionQueueService.getQueuePosition(100L)).thenReturn(3);

        // when
        Response<SubmissionDTO> resp = submissionService.createSubmission(dto);

        // then
        assertEquals(HttpStatus.ACCEPTED.value(), resp.getStatusCode());
        assertEquals(SubmissionStatus.PENDING, resp.getData().getSubmissionStatus());
        assertEquals(10L, resp.getData().getProblemId());
        assertEquals(3, resp.getData().getQueuePosition());
        verify(submissionQueueService).enqueue(any());
        verify(submissionQueueService).setCooldown(1L);
    }

    @Test
    void createSubmission_OnCooldown_Returns429() {
        // given
        User u = user(1L, "PARTICIPANT");
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(submissionQueueService.isOnCooldown(1L)).thenReturn(true);
        when(submissionQueueService.getCooldownSeconds()).thenReturn(10);

        // when
        Response<SubmissionDTO> resp = submissionService.createSubmission(baseDto());

        // then
        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), resp.getStatusCode());
        assertTrue(resp.getMessage().contains("10"));
        verify(submissionRepository, never()).save(any());
        verify(submissionQueueService, never()).enqueue(any());
    }

    @Test
    void createSubmission_ProblemMissing_ThrowsNotFound() {
        // given
        User u = user(1L, "PARTICIPANT");
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(submissionQueueService.isOnCooldown(1L)).thenReturn(false);
        when(problemRepository.findById(10L)).thenReturn(Optional.empty());

        // when + then
        NotFoundException ex = assertThrows(NotFoundException.class,
                () -> submissionService.createSubmission(baseDto()));
        assertEquals("Problem not found", ex.getMessage());
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void createSubmission_ContestWithoutRegistration_Returns403() {
        // given
        User u = user(2L, "PARTICIPANT");
        SubmissionDTO dto = baseDto();
        dto.setContestId(50L);

        Problem p = new Problem();
        p.setId(10L);

        Contest contest = new Contest();
        contest.setId(50L);
        User creator = new User();
        creator.setId(999L);
        contest.setCreator(creator);

        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(submissionQueueService.isOnCooldown(2L)).thenReturn(false);
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(contestRepository.findById(50L)).thenReturn(Optional.of(contest));
        when(contestRegistrationRepository.existsByContestIdAndUserIdAndStatus(
                50L, 2L, ContestRegistrationStatus.APPROVED)).thenReturn(false);

        // when
        Response<SubmissionDTO> resp = submissionService.createSubmission(dto);

        // then
        assertEquals(HttpStatus.FORBIDDEN.value(), resp.getStatusCode());
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void createSubmission_AdminBypassesContestRegistration_Success() {
        // given
        User admin = user(3L, "ADMIN");
        SubmissionDTO dto = baseDto();
        dto.setContestId(50L);

        Problem p = new Problem();
        p.setId(10L);
        Contest contest = new Contest();
        contest.setId(50L);
        User other = new User();
        other.setId(999L);
        contest.setCreator(other);

        when(userService.getCurrentLoggedInUser()).thenReturn(admin);
        when(submissionQueueService.isOnCooldown(3L)).thenReturn(false);
        when(problemRepository.findById(10L)).thenReturn(Optional.of(p));
        when(contestRepository.findById(50L)).thenReturn(Optional.of(contest));
        when(submissionRepository.save(any(Submission.class))).thenAnswer(inv -> {
            Submission s = inv.getArgument(0);
            s.setId(200L);
            return s;
        });
        when(modelMapper.map(any(Submission.class), eq(SubmissionDTO.class)))
                .thenReturn(new SubmissionDTO());

        // when
        Response<SubmissionDTO> resp = submissionService.createSubmission(dto);

        // then
        assertEquals(HttpStatus.ACCEPTED.value(), resp.getStatusCode());
        verify(contestRegistrationRepository, never())
                .existsByContestIdAndUserIdAndStatus(anyLong(), anyLong(), any());
        verify(submissionQueueService).enqueue(any());
    }

    @Test
    void getMySubmissions_PaginationOK() {
        // given
        User u = user(1L, "PARTICIPANT");
        Submission s = new Submission();
        s.setId(7L);
        Problem p = new Problem();
        p.setId(10L);
        s.setProblem(p);

        Page<Submission> page = new PageImpl<>(List.of(s));
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(submissionRepository.findByUserId(eq(1L), any(Pageable.class))).thenReturn(page);
        when(modelMapper.map(s, SubmissionDTO.class)).thenReturn(new SubmissionDTO());

        // when
        Response<Page<SubmissionDTO>> resp = submissionService.getMySubmissions(20, 0, null);

        // then
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals(1, resp.getData().getTotalElements());
        assertEquals(10L, resp.getData().getContent().get(0).getProblemId());
        verify(submissionRepository).findByUserId(eq(1L), any(Pageable.class));
    }

    @Test
    void getSubmissionStatus_NotFound_Throws() {
        when(submissionRepository.findById(99L)).thenReturn(Optional.empty());
        NotFoundException ex = assertThrows(NotFoundException.class,
                () -> submissionService.getSubmissionStatus(99L));
        assertEquals("Submission not found", ex.getMessage());
    }

    @Test
    void getSubmissionStatus_Pending_PopulatesQueuePosition() {
        Submission s = new Submission();
        s.setId(5L);
        s.setSubmissionStatus(SubmissionStatus.PENDING);
        Problem p = new Problem();
        p.setId(2L);
        s.setProblem(p);

        SubmissionDTO mapped = new SubmissionDTO();
        when(submissionRepository.findById(5L)).thenReturn(Optional.of(s));
        when(modelMapper.map(s, SubmissionDTO.class)).thenReturn(mapped);
        when(submissionQueueService.getQueuePosition(5L)).thenReturn(7);

        Response<SubmissionDTO> resp = submissionService.getSubmissionStatus(5L);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals(7, resp.getData().getQueuePosition());
        assertEquals(2L, resp.getData().getProblemId());
    }

    private static <T> T eq(T value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
