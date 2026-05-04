package com.oj.TDTUOJ.problemComment.service;

import com.oj.TDTUOJ.common.enums.VoteType;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problemComment.dto.ProblemCommentDTO;
import org.springframework.data.domain.Page;

import java.util.List;

public interface ProblemCommentService {

    /** Get paginated top-level comments (with replies) for a problem, newest first. */
    Response<Page<ProblemCommentDTO>> getComments(Long problemId, int page, int size);

    /** Create a top-level comment or reply (set parentId in dto for reply). */
    Response<ProblemCommentDTO> createComment(Long problemId, ProblemCommentDTO dto);

    /** Edit comment content. Only author may edit. */
    Response<ProblemCommentDTO> editComment(Long problemId, Long commentId, ProblemCommentDTO dto);

    /** Soft-delete. Author or ADMIN. Sets isDeleted=true, clears content. */
    Response<?> deleteComment(Long problemId, Long commentId);

    /**
     * Toggle vote. Rules:
     * - Same vote again → remove vote (un-vote).
     * - Different vote → switch vote type.
     * - No prior vote → add vote.
     */
    Response<ProblemCommentDTO> voteComment(Long problemId, Long commentId, VoteType voteType);
}
