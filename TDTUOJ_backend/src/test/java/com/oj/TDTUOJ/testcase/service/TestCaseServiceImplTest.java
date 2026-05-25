package com.oj.TDTUOJ.testcase.service;

import com.oj.TDTUOJ.common.aws.AwsS3Service;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.testcase.dto.TestCaseDTO;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.testcase.repository.TestCaseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TestCaseServiceImplTest {
    @Mock private TestCaseRepository testCaseRepository;
    @Mock private ProblemRepository problemRepository;
    @Mock private ModelMapper modelMapper;
    @Mock private AwsS3Service awsS3Service;

    @InjectMocks private TestCaseServiceImpl service;

    @Test
    void getAllTestCases_ReturnsMappedList() {
        TestCase t1 = TestCase.builder().id(1L).build();
        TestCase t2 = TestCase.builder().id(2L).build();
        TestCaseDTO d1 = new TestCaseDTO();
        d1.setId(1L);
        TestCaseDTO d2 = new TestCaseDTO();
        d2.setId(2L);
        when(testCaseRepository.findAll()).thenReturn(List.of(t1, t2));
        when(modelMapper.map(t1, TestCaseDTO.class)).thenReturn(d1);
        when(modelMapper.map(t2, TestCaseDTO.class)).thenReturn(d2);

        Response<List<TestCaseDTO>> resp = service.getAllTestCases();

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals(2, resp.getData().size());
    }

    @Test
    void getTestCaseById_Success() {
        TestCase t = TestCase.builder().id(5L).build();
        TestCaseDTO d = new TestCaseDTO();
        d.setId(5L);
        when(testCaseRepository.findById(5L)).thenReturn(Optional.of(t));
        when(modelMapper.map(t, TestCaseDTO.class)).thenReturn(d);

        Response<TestCaseDTO> resp = service.getTestCaseById(5L);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        assertEquals(5L, resp.getData().getId());
    }

    @Test
    void getTestCaseById_NotFound_Throws() {
        when(testCaseRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.getTestCaseById(99L));
    }

    @Test
    void createTestCase_ProblemMissing_ThrowsNotFound() {
        TestCaseDTO dto = new TestCaseDTO();
        dto.setProblemId(50L);
        when(problemRepository.findById(50L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.createTestCase(dto));
    }

    @Test
    void createTestCase_MissingInputFile_ThrowsBadRequest() {
        TestCaseDTO dto = new TestCaseDTO();
        dto.setProblemId(50L);
        Problem p = new Problem();
        p.setId(50L);
        p.setTitle("Hello");
        when(problemRepository.findById(50L)).thenReturn(Optional.of(p));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.createTestCase(dto));
        assertTrue(ex.getMessage().contains("Input file"));
    }

    @Test
    void createTestCase_MissingOutputFile_ThrowsBadRequest() {
        TestCaseDTO dto = new TestCaseDTO();
        dto.setProblemId(50L);
        dto.setInputFile(new MockMultipartFile("in", "in.txt", "text/plain", "1".getBytes()));
        Problem p = new Problem();
        p.setId(50L);
        p.setTitle("Hello");
        when(problemRepository.findById(50L)).thenReturn(Optional.of(p));

        assertThrows(BadRequestException.class, () -> service.createTestCase(dto));
    }
}
