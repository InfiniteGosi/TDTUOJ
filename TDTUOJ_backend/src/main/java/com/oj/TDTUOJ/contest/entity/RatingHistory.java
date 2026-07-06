package com.oj.TDTUOJ.contest.entity;

import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * One immutable link in a user's rating chain: the old/new rating and delta from
 * a single rated contest. Rows are ordered by {@code contestEndTime}; each row's
 * {@code oldRating} must equal the previous row's {@code newRating}, an invariant
 * that {@link com.oj.TDTUOJ.contest.service.ContestRatingService} rebuilds on
 * (re)processing. The (user, contest) unique constraint enforces idempotency.
 */
@Entity
@Data
@Table(name = "rating_history", uniqueConstraints = @UniqueConstraint(name = "uk_rating_history_user_contest", columnNames = {"user_id", "contest_id"}))
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RatingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    // Denormalized for quick display on profile without joining contests
    private Long contestId;
    private String contestName;

    private Integer oldRating;
    private Integer newRating;
    private Integer ratingChange;   // newRating - oldRating (can be negative)

    private Integer rank;           // final rank in this contest

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime contestEndTime;
}