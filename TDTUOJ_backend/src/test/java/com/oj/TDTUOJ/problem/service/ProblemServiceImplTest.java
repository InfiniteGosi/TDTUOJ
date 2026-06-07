package com.oj.TDTUOJ.problem.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.enums.ProblemDifficulty;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.problemTag.repository.TagRepository;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProblemServiceImplTest {
    @Mock private ProblemRepository problemRepository;
    @Mock private TestCaseRepository testCaseRepository;
    @Mock private UserRepository userRepository;
    @Mock private ModelMapper modelMapper;
    @Mock private AwsS3Service awsS3Service;
    @Mock private TagRepository tagRepository;
    @Mock private SubmissionRepository submissionRepository;
    @Mock private UserService userService;
    @Mock private com.oj.TDTUOJ.contest.repository.ContestProblemRepository contestProblemRepository;
    @Mock private com.oj.TDTUOJ.lab.repository.LabExerciseRepository labExerciseRepository;

    @InjectMocks private ProblemServiceImpl problemService;

    private Problem problem(Long id, String title, String slug) {
        return Problem.builder()
                .id(id)
                .title(title)
                .slug(slug)
                .isPublic(true)
                .problemDifficulty(ProblemDifficulty.EASY)
                .testCases(new ArrayList<>())
                .build();
    }

    @Test
    void getProblemBySlug_NotFound_Throws404() {
        when(problemRepository.findBySlug("missing")).thenReturn(Optional.empty());
        NotFoundException ex = assertThrows(NotFoundException.class,
                () -> problemService.getProblemBySlug("missing"));
        assertEquals("Problem not found", ex.getMessage());
    }

    @Test
    void getProblemBySlug_Success() {
        Problem p = problem(1L, "Hello", "hello");
        when(problemRepository.findBySlug("hello")).thenReturn(Optional.of(p));
        when(userService.getCurrentLoggedInUser()).thenThrow(new RuntimeException("no auth"));

        Response<ProblemDTO> resp = problemService.getProblemBySlug("hello");

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals("hello", resp.getData().getSlug());
        assertEquals(false, resp.getData().getSolved());
        assertEquals(false, resp.getData().getAttempted());
    }

    // ── Private-problem slug guard ──────────────────────────────────────────

    @Test
    void getProblemBySlug_privateProblem_anonymous_noStartedContest_throws404() {
        Problem p = problem(1L, "Secret", "secret");
        p.setIsPublic(false);
        when(problemRepository.findBySlug("secret")).thenReturn(Optional.of(p));
        when(contestProblemRepository.existsStartedContestAttachment(eq(1L), any()))
                .thenReturn(false);
        when(userService.getCurrentLoggedInUser()).thenThrow(new RuntimeException("no auth"));

        NotFoundException ex = assertThrows(NotFoundException.class,
                () -> problemService.getProblemBySlug("secret"));
        assertEquals("Problem not found", ex.getMessage());
    }

    @Test
    void getProblemBySlug_privateProblem_inStartedContest_visible() {
        Problem p = problem(1L, "Secret", "secret");
        p.setIsPublic(false);
        when(problemRepository.findBySlug("secret")).thenReturn(Optional.of(p));
        when(contestProblemRepository.existsStartedContestAttachment(eq(1L), any()))
                .thenReturn(true);
        when(userService.getCurrentLoggedInUser()).thenThrow(new RuntimeException("no auth"));

        Response<ProblemDTO> resp = problemService.getProblemBySlug("secret");
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
    }

    @Test
    void getProblemBySlug_privateProblem_inLab_visible() {
        Problem p = problem(1L, "Secret", "secret");
        p.setIsPublic(false);
        when(problemRepository.findBySlug("secret")).thenReturn(Optional.of(p));
        when(contestProblemRepository.existsStartedContestAttachment(eq(1L), any()))
                .thenReturn(false);
        when(labExerciseRepository.existsByProblemId(1L)).thenReturn(true);
        when(userService.getCurrentLoggedInUser()).thenThrow(new RuntimeException("no auth"));

        Response<ProblemDTO> resp = problemService.getProblemBySlug("secret");
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
    }

    @Test
    void getProblemBySlug_privateProblem_author_visible() {
        User author = new User(); author.setId(7L); author.setRoles(java.util.Set.of());
        Problem p = problem(1L, "Secret", "secret");
        p.setIsPublic(false);
        p.setAuthor(author);
        when(problemRepository.findBySlug("secret")).thenReturn(Optional.of(p));
        when(contestProblemRepository.existsStartedContestAttachment(eq(1L), any()))
                .thenReturn(false);
        when(userService.getCurrentLoggedInUser()).thenReturn(author);

        Response<ProblemDTO> resp = problemService.getProblemBySlug("secret");
        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
    }

    @Test
    void getAllProblems_NoFilters_UsesFindByIsPublicTrue() {
        Page<Problem> empty = new PageImpl<>(Collections.emptyList());
        when(problemRepository.findByIsPublicTrue(any(Pageable.class))).thenReturn(empty);

        Response<Page<ProblemDTO>> resp = problemService.getAllProblems(
                20, 0, "id", "asc", null, null, null);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        verify(problemRepository).findByIsPublicTrue(any(Pageable.class));
    }

    @Test
    void getAllProblems_TitleOnly_UsesTitleContainingAndPublic() {
        Page<Problem> empty = new PageImpl<>(Collections.emptyList());
        when(problemRepository.findByTitleContainingIgnoreCaseAndIsPublicTrue(
                eq("hello"), any(Pageable.class))).thenReturn(empty);

        problemService.getAllProblems(20, 0, "id", "asc", "hello", null, null);

        verify(problemRepository).findByTitleContainingIgnoreCaseAndIsPublicTrue(
                eq("hello"), any(Pageable.class));
        verify(problemRepository, never()).findByIsPublicTrue(any(Pageable.class));
    }

    @Test
    void createProblem_MissingStatementFile_ThrowsIllegalArgument() {
        ProblemDTO dto = new ProblemDTO();
        dto.setTitle("New Problem");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> problemService.createProblem(dto));
        assertTrue(ex.getMessage().contains("statement file"));
        verify(problemRepository, never()).save(any());
    }

    @Test
    void createProblem_DuplicateTitle_ThrowsIllegalArgument() {
        ProblemDTO dto = new ProblemDTO();
        dto.setTitle("Existing");
        dto.setStatementFile(new MockMultipartFile("statement", "x.md", "text/markdown", "x".getBytes()));
        dto.setTestCases(List.of(new TestCaseDTO()));
        when(problemRepository.existsByTitle("Existing")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> problemService.createProblem(dto));
        assertTrue(ex.getMessage().contains("already exists"));
        verify(problemRepository, never()).save(any());
    }

    @Test
    void createProblem_GeneratesSlugAndSaves() throws Exception {
        // given
        ProblemDTO dto = new ProblemDTO();
        dto.setTitle("Two Sum");
        dto.setPoint(50);
        dto.setProblemDifficulty(ProblemDifficulty.EASY);
        dto.setIsPublic(true);
        dto.setAuthorId(1L);
        dto.setStatementFile(new MockMultipartFile("statement", "s.md", "text/markdown", "body".getBytes()));

        TestCaseDTO tc = new TestCaseDTO();
        tc.setInputFile(new MockMultipartFile("in", "in.txt", "text/plain", "1".getBytes()));
        tc.setExpectedOutputFile(new MockMultipartFile("out", "out.txt", "text/plain", "1".getBytes()));
        dto.setTestCases(List.of(tc));

        User author = new User();
        author.setId(1L);
        author.setUsername("alice");

        when(problemRepository.existsByTitle("Two Sum")).thenReturn(false);
        when(problemRepository.existsBySlug(anyString())).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(author));
        when(problemRepository.save(any(Problem.class))).thenAnswer(inv -> {
            Problem p = inv.getArgument(0);
            if (p.getId() == null) p.setId(7L);
            return p;
        });
        when(awsS3Service.uploadFile(anyString(), any())).thenReturn(new URL("http://s3/file"));
        when(userService.getCurrentLoggedInUser()).thenThrow(new RuntimeException());

        // when
        Response<ProblemDTO> resp = problemService.createProblem(dto);

        // then
        assertEquals(HttpStatus.CREATED.value(), resp.getStatusCode());
        ArgumentCaptor<Problem> captor = ArgumentCaptor.forClass(Problem.class);
        verify(problemRepository, atLeastOnce()).save(captor.capture());
        Problem saved = captor.getAllValues().get(0);
        assertEquals("two-sum", saved.getSlug());
        assertEquals(author, saved.getAuthor());
    }

    @Test
    void deleteProblem_RemovesEntityAndTestCases() {
        Problem p = problem(5L, "Title", "title");
        TestCase t = TestCase.builder()
                .id(1L)
                .inputFileUrl("http://s3/in")
                .expectedOutputFileUrl("http://s3/out")
                .build();
        p.setTestCases(new ArrayList<>(List.of(t)));
        p.setStatementFileUrl("http://s3/stmt");
        when(problemRepository.findById(5L)).thenReturn(Optional.of(p));

        Response<?> resp = problemService.deleteProblem(5L);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        verify(testCaseRepository).deleteAll(p.getTestCases());
        verify(problemRepository).delete(p);
    }

    @Test
    void deleteProblem_NotFound_Throws404() {
        when(problemRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> problemService.deleteProblem(99L));
    }
}
