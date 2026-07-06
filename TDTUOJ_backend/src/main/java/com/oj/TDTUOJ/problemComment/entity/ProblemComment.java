package com.oj.TDTUOJ.problemComment.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A comment posted on a problem's discussion thread.
 *
 * <p>The threading model is intentionally <b>flat (two levels only)</b>: a comment is either
 * a top-level comment ({@code parent == null}) or a direct reply to a top-level comment.
 * Replies-to-replies are collapsed back onto the root parent (see the create logic in the
 * service), so nesting never exceeds one level. This keeps rendering simple and avoids
 * unbounded recursion.</p>
 *
 * <p>Upvote/downvote tallies are stored <b>denormalized</b> on the row ({@code upvoteCount} /
 * {@code downvoteCount}) so the discussion list can be rendered without aggregating the
 * {@code comment_votes} table on every read; the individual votes still live in
 * {@link CommentVote}.</p>
 */
@Entity
@Data
@Table(name = "problem_comments")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProblemComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    @JsonIgnore
    private Problem problem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    /**
     * Null = top-level comment.
     * Non-null = reply (always points to a top-level comment — flat model).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ProblemComment parent;

    /**
     * Replies to this comment. Only populated for top-level comments.
     * Ordered by createdAt ASC so replies read chronologically top-to-bottom.
     */
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ProblemComment> replies = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String content;

    /** Soft delete flag. Content is cleared on delete but row stays for reply threading. */
    @Builder.Default
    @Column(nullable = false)
    private Boolean isDeleted = false;

    /** Denormalized upvote counter — updated on every vote change. */
    @Builder.Default
    @Column(nullable = false)
    private Integer upvoteCount = 0;

    /** Denormalized downvote counter — updated on every vote change. */
    @Builder.Default
    @Column(nullable = false)
    private Integer downvoteCount = 0;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
