package com.oj.TDTUOJ.contest.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.*;

/**
 * Join row attaching a {@link com.oj.TDTUOJ.problem.entity.Problem} to a
 * {@link Contest}, carrying contest-scoped overrides: display order and the
 * points awarded within this contest (which may differ from the problem's base
 * point value).
 */
@Entity
@Data
@Table(name = "contests_problems")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ContestProblem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Problem problem;

    // Display order inside the contest (1, 2, 3... or A, B, C mapped to index)
    private Integer problemOrder;

    // Points awarded for solving in this contest (may differ from problem.point)
    private Integer points;
}