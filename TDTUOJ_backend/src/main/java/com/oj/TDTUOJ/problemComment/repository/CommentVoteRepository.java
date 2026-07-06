package com.oj.TDTUOJ.problemComment.repository;

import com.oj.TDTUOJ.common.enums.VoteType;
import com.oj.TDTUOJ.problemComment.entity.CommentVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Data access for {@link CommentVote} rows — the per-user vote records backing the
 * denormalized upvote/downvote counters on {@link com.oj.TDTUOJ.problemComment.entity.ProblemComment}.
 */
public interface CommentVoteRepository extends JpaRepository<CommentVote, Long> {

    /** Find current user's vote on a specific comment. */
    Optional<CommentVote> findByCommentIdAndUserId(Long commentId, Long userId);

    /** Remove a vote (used when toggling same vote type). */
    @Modifying
    @Query("DELETE FROM CommentVote v WHERE v.comment.id = :commentId AND v.user.id = :userId")
    void deleteByCommentIdAndUserId(@Param("commentId") Long commentId, @Param("userId") Long userId);

    /**
     * Bulk-fetch current user's votes for a set of comment IDs.
     * Used in mapToDTO to populate userVote field without N+1 queries.
     *
     * Returns a list of [commentId, voteType] Object[] pairs.
     */
    @Query("SELECT v.comment.id, v.voteType FROM CommentVote v WHERE v.comment.id IN :commentIds AND v.user.id = :userId")
    List<Object[]> findVotesByCommentIdsAndUserId(@Param("commentIds") Set<Long> commentIds,
                                                   @Param("userId") Long userId);
}
