package com.oj.TDTUOJ.userStatistics.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "user_statistics")
public class UserStatistics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(nullable = false)
    @Builder.Default
    private Integer problemsSolved = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalSubmissions = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer acceptedSubmissions = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalPoints = 0;

    @Builder.Default
    private Integer currentRating = 0;

    @Builder.Default
    private Integer maxRating = 0;

    // Stored as percentage 0-100
    @Builder.Default
    private Double acceptanceRate = 0.0;
}