package com.oj.TDTUOJ.problemFavorite.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A user's bookmark ("favorite") of a problem — one row per (user, problem) pair.
 *
 * <p>The {@code (user_id, problem_id)} unique constraint guarantees a problem can be favorited
 * at most once by a given user, so the toggle logic can rely on find-or-create semantics.</p>
 */
@Entity
@Data
@Table(
        name = "problem_favorites",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "problem_id"})
)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProblemFavorite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    @JsonIgnore
    private Problem problem;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
