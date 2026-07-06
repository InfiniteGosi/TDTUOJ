package com.oj.TDTUOJ.userStatistics.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Denormalized per-user counters powering the profile stats panel and the
 * dashboard top-solvers board. One row per user (enforced by the unique
 * {@code user_id}); incrementally maintained by the submission pipeline and
 * lazily backfilled from history on first read.
 */
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

    // Unique — links this stats row to exactly one user (no FK, joined manually by id).
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    // Distinct problems ever AC'd by this user.
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

    // Rating fields are persisted for future use; not yet driven by a rating algorithm.
    @Builder.Default
    private Integer currentRating = 0;

    // Highest rating ever reached (peak) — retained even if currentRating later drops.
    @Builder.Default
    private Integer maxRating = 0;

    // Stored as percentage 0-100
    @Builder.Default
    private Double acceptanceRate = 0.0;
}