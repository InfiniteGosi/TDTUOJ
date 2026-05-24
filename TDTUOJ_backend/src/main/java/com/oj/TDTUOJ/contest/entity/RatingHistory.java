package com.oj.TDTUOJ.contest.entity;

import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

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