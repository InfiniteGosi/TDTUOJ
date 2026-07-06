package com.oj.TDTUOJ.problemComment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.oj.TDTUOJ.common.enums.VoteType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Transport object for a single comment. Serves both directions: it carries {@code content}
 * (and optional {@code parentId} for replies) on create/edit, and the full rendered view —
 * author, vote tallies, the caller's own {@link VoteType}, and nested {@code replies} — on read.
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProblemCommentDTO {

    private Long id;

    // ─── Problem / Parent refs ───────────────────────────────────────────────
    private Long problemId;
    private Long parentId;       // null = top-level

    // ─── Author info ─────────────────────────────────────────────────────────
    private Long userId;
    private String username;
    private String userProfileUrl;

    // ─── Content ─────────────────────────────────────────────────────────────
    /** Input on create/edit. On fetch: "[deleted]" when isDeleted=true. */
    private String content;
    private Boolean isDeleted;

    // ─── Votes ───────────────────────────────────────────────────────────────
    private Integer upvoteCount;
    private Integer downvoteCount;
    /** Current authenticated user's vote on this comment. Null if not voted / not logged in. */
    private VoteType userVote;

    // ─── Replies (only on top-level comments, newest first) ──────────────────
    private List<ProblemCommentDTO> replies;

    // ─── Timestamps ──────────────────────────────────────────────────────────
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
