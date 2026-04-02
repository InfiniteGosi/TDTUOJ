package com.oj.TDTUOJ.contest.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Persists a JSON snapshot of the leaderboard to the DB so the last known
 * state survives a Redis restart.  Matches the {@code leaderboard_cache}
 * table from the ER diagram (type, rankings, total_users, last_updated).
 */
@Entity
@Data
@Table(name = "leaderboard_cache")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LeaderboardCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Either "GLOBAL" or the contest ID as a string — kept as a free-form
     * discriminator matching the ER diagram's {@code type} column.
     */
    @Column(nullable = false, unique = true)
    private String type;

    /** Full leaderboard serialised as a JSON string. */
    @Column(columnDefinition = "TEXT")
    private String rankings;

    private Integer totalUsers;

    @UpdateTimestamp
    private LocalDateTime lastUpdated;
}
