package com.oj.TDTUOJ.problemComment.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.common.enums.VoteType;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A single user's vote (UPVOTE or DOWNVOTE) on one comment.
 *
 * <p>The {@code (comment_id, user_id)} unique constraint enforces <b>one vote per user per
 * comment</b> at the database level — the service toggles/switches this row rather than
 * inserting duplicates, and the parent comment's denormalized counters are adjusted to match.</p>
 */
@Entity
@Data
@Table(
        name = "comment_votes",
        uniqueConstraints = @UniqueConstraint(columnNames = {"comment_id", "user_id"})
)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommentVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ProblemComment comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private VoteType voteType;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
