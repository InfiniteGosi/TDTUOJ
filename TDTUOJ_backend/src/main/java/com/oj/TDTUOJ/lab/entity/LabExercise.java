package com.oj.TDTUOJ.lab.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.*;

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

    private Integer exerciseOrder;

    private Integer points;
}
