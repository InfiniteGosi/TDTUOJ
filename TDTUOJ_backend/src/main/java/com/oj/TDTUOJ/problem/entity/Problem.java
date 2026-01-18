package com.oj.TDTUOJ.problem.entity;

import com.oj.TDTUOJ.testcase.entity.TestCase;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Entity
@Data
@Table(name = "problem")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Problem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String title;

    private String statementFileUrl; // S3 URL to problem statement (.md file)

    private Integer point;

    private Double timeLimit; // in seconds

    private Integer memoryLimit; // in KB

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TestCase> testCases;
}
