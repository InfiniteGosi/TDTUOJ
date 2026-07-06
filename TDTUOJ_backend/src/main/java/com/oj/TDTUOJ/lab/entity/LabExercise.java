package com.oj.TDTUOJ.lab.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.*;

/**
 * Join row between a {@link Lab} and a {@link Problem}: one problem appearing as
 * a graded exercise in a lab, with its own display order and point value.
 */
@Entity
@Data
@Table(name = "lab_exercises")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LabExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Parent lab. @JsonIgnore breaks the lab -> exercises -> lab serialization cycle.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Lab lab;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Problem problem;

    // 1-based position within the lab; also drives the A/B/C... column labels on export.
    private Integer exerciseOrder;

    // Points awarded for solving; defaults to the problem's own point value if unspecified.
    private Integer points;
}
