package com.oj.TDTUOJ.problemComment.service;

import com.oj.TDTUOJ.common.enums.VoteType;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.problemComment.dto.ProblemCommentDTO;
import com.oj.TDTUOJ.problemComment.entity.CommentVote;
import com.oj.TDTUOJ.problemComment.entity.ProblemComment;
import com.oj.TDTUOJ.problemComment.repository.CommentVoteRepository;
import com.oj.TDTUOJ.problemComment.repository.ProblemCommentRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Default implementation of the threaded comment + voting system.
 *
 * <p>Key design points reflected below:</p>
 * <ul>
 *   <li><b>Flat threading</b> — replies always attach to the root top-level comment; a reply to
 *       a reply is redirected up to the root so the tree never nests beyond one level.</li>
 *   <li><b>Denormalized counters</b> — {@code upvoteCount}/{@code downvoteCount} on the comment
 *       are kept in sync via {@link #adjustCounts} on every vote add/switch/remove, avoiding an
 *       aggregate query per render.</li>
 *   <li><b>N+1 avoidance</b> — the caller's own votes for a whole page (comments + replies) are
 *       fetched in a single bulk query via {@link #buildUserVoteMap}.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProblemCommentServiceImpl implements ProblemCommentService {

    private final ProblemCommentRepository commentRepository;
    private final CommentVoteRepository voteRepository;
    private final ProblemRepository problemRepository;
    private final UserService userService;

    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Response<Page<ProblemCommentDTO>> getComments(Long problemId, int page, int size) {
        ensureProblemExists(problemId);
        // Clamp client-supplied paging to a sane window (cap page size at 50) to bound query cost.
        if (size <= 0 || size > 50) size = 10;
        if (page < 0) page = 0;

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ProblemComment> topLevelPage =
                commentRepository.findByProblemIdAndParentIsNull(problemId, pageable);

        // Build vote map from this page's comments (+ their replies) — one bulk query
        List<ProblemComment> topLevelList = topLevelPage.getContent();
        Map<Long, VoteType> userVoteMap = buildUserVoteMap(topLevelList);

        Page<ProblemCommentDTO> dtoPage = topLevelPage.map(c -> mapToDTO(c, userVoteMap, true));

        return Response.<Page<ProblemCommentDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Comments retrieved successfully")
                .data(dtoPage)
                .build();
    }

    @Override
    @Transactional
    public Response<ProblemCommentDTO> createComment(Long problemId, ProblemCommentDTO dto) {
        User currentUser = userService.getCurrentLoggedInUser();
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new NotFoundException("Problem not found: " + problemId));

        if (dto.getContent() == null || dto.getContent().isBlank()) {
            throw new BadRequestException("Comment content must not be empty");
        }

        ProblemComment.ProblemCommentBuilder builder = ProblemComment.builder()
                .problem(problem)
                .user(currentUser)
                .content(dto.getContent().trim());

        // Handle reply — resolve parent, enforce flat model
        if (dto.getParentId() != null) {
            ProblemComment parent = commentRepository.findByIdAndProblemId(dto.getParentId(), problemId)
                    .orElseThrow(() -> new NotFoundException("Parent comment not found: " + dto.getParentId()));

            // Flat model: if parent itself has a parent, redirect to the root parent
            ProblemComment root = parent.getParent() != null ? parent.getParent() : parent;
            builder.parent(root);
        }

        ProblemComment saved = commentRepository.save(builder.build());

        return Response.<ProblemCommentDTO>builder()
                .statusCode(HttpStatus.CREATED.value())
                .message("Comment posted successfully")
                .data(mapToDTO(saved, Collections.emptyMap(), false))
                .build();
    }

    @Override
    @Transactional
    public Response<ProblemCommentDTO> editComment(Long problemId, Long commentId, ProblemCommentDTO dto) {
        User currentUser = userService.getCurrentLoggedInUser();
        ProblemComment comment = findComment(commentId, problemId);

        if (!comment.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedAccessException("Only the author can edit this comment");
        }
        if (Boolean.TRUE.equals(comment.getIsDeleted())) {
            throw new BadRequestException("Cannot edit a deleted comment");
        }
        if (dto.getContent() == null || dto.getContent().isBlank()) {
            throw new BadRequestException("Comment content must not be empty");
        }

        comment.setContent(dto.getContent().trim());
        ProblemComment saved = commentRepository.save(comment);

        return Response.<ProblemCommentDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Comment updated successfully")
                .data(mapToDTO(saved, Collections.emptyMap(), false))
                .build();
    }

    @Override
    @Transactional
    public Response<?> deleteComment(Long problemId, Long commentId) {
        User currentUser = userService.getCurrentLoggedInUser();
        ProblemComment comment = findComment(commentId, problemId);

        boolean isAuthor = comment.getUser().getId().equals(currentUser.getId());
        boolean isAdmin  = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ADMIN"));

        if (!isAuthor && !isAdmin) {
            throw new UnauthorizedAccessException("Not authorized to delete this comment");
        }

        comment.setIsDeleted(true);
        comment.setContent(null); // clear content; DTO mapper returns "[deleted]"
        commentRepository.save(comment);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Comment deleted")
                .build();
    }

    @Override
    @Transactional
    public Response<ProblemCommentDTO> voteComment(Long problemId, Long commentId, VoteType voteType) {
        User currentUser = userService.getCurrentLoggedInUser();
        ProblemComment comment = findComment(commentId, problemId);

        Optional<CommentVote> existing = voteRepository.findByCommentIdAndUserId(commentId, currentUser.getId());

        if (existing.isPresent()) {
            CommentVote prior = existing.get();
            if (prior.getVoteType() == voteType) {
                // Same vote → remove (un-vote)
                voteRepository.deleteByCommentIdAndUserId(commentId, currentUser.getId());
                adjustCounts(comment, voteType, -1);
            } else {
                // Different vote → switch
                adjustCounts(comment, prior.getVoteType(), -1);
                prior.setVoteType(voteType);
                voteRepository.save(prior);
                adjustCounts(comment, voteType, +1);
            }
        } else {
            // New vote
            voteRepository.save(CommentVote.builder()
                    .comment(comment)
                    .user(currentUser)
                    .voteType(voteType)
                    .build());
            adjustCounts(comment, voteType, +1);
        }

        ProblemComment saved = commentRepository.save(comment);

        // Re-read the (possibly now-absent) vote so the response reflects the caller's final
        // state — UPVOTE, DOWNVOTE, or null after an un-vote.
        Optional<CommentVote> afterVote = voteRepository.findByCommentIdAndUserId(commentId, currentUser.getId());
        Map<Long, VoteType> voteMap = afterVote
                .map(v -> Map.of(commentId, v.getVoteType()))
                .orElse(Collections.emptyMap());

        return Response.<ProblemCommentDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Vote recorded")
                .data(mapToDTO(saved, voteMap, false))
                .build();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private ProblemComment findComment(Long commentId, Long problemId) {
        return commentRepository.findByIdAndProblemId(commentId, problemId)
                .orElseThrow(() -> new NotFoundException("Comment not found: " + commentId));
    }

    private void ensureProblemExists(Long problemId) {
        if (!problemRepository.existsById(problemId)) {
            throw new NotFoundException("Problem not found: " + problemId);
        }
    }

    /**
     * Applies {@code delta} (+1/-1) to the denormalized counter matching {@code type}.
     * Floored at 0 defensively so a counter can never go negative if it ever drifts out of
     * sync with the underlying vote rows.
     */
    private void adjustCounts(ProblemComment comment, VoteType type, int delta) {
        if (type == VoteType.UPVOTE) {
            comment.setUpvoteCount(Math.max(0, comment.getUpvoteCount() + delta));
        } else {
            comment.setDownvoteCount(Math.max(0, comment.getDownvoteCount() + delta));
        }
    }

    /**
     * Collects all comment IDs (top-level + replies) from the list,
     * then bulk-fetches the current user's votes in one query.
     * Returns empty map if user not authenticated.
     */
    private Map<Long, VoteType> buildUserVoteMap(List<ProblemComment> topLevel) {
        try {
            User currentUser = userService.getCurrentLoggedInUser();

            Set<Long> ids = new HashSet<>();
            for (ProblemComment c : topLevel) {
                ids.add(c.getId());
                for (ProblemComment r : c.getReplies()) {
                    ids.add(r.getId());
                }
            }
            if (ids.isEmpty()) return Collections.emptyMap();

            List<Object[]> rows = voteRepository.findVotesByCommentIdsAndUserId(ids, currentUser.getId());
            Map<Long, VoteType> map = new HashMap<>();
            for (Object[] row : rows) {
                map.put((Long) row[0], (VoteType) row[1]);
            }
            return map;
        } catch (Exception e) {
            // User not authenticated — no votes to show
            return Collections.emptyMap();
        }
    }

    /**
     * Maps a ProblemComment entity to DTO.
     * @param includeReplies true for top-level comments (attach reply list).
     */
    private ProblemCommentDTO mapToDTO(ProblemComment comment,
                                       Map<Long, VoteType> userVoteMap,
                                       boolean includeReplies) {
        ProblemCommentDTO dto = new ProblemCommentDTO();
        dto.setId(comment.getId());
        dto.setProblemId(comment.getProblem().getId());
        dto.setParentId(comment.getParent() != null ? comment.getParent().getId() : null);

        // Soft-deleted: hide author info and content
        if (Boolean.TRUE.equals(comment.getIsDeleted())) {
            dto.setIsDeleted(true);
            dto.setContent("[deleted]");
            dto.setUsername("[deleted]");
        } else {
            dto.setIsDeleted(false);
            dto.setContent(comment.getContent());
            dto.setUserId(comment.getUser().getId());
            dto.setUsername(comment.getUser().getUsername());
            dto.setUserProfileUrl(comment.getUser().getProfileUrl());
        }

        dto.setUpvoteCount(comment.getUpvoteCount());
        dto.setDownvoteCount(comment.getDownvoteCount());
        dto.setUserVote(userVoteMap.get(comment.getId()));
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setUpdatedAt(comment.getUpdatedAt());

        // Replies: newest first (reverse the ASC-ordered list from DB)
        if (includeReplies && comment.getReplies() != null) {
            List<ProblemCommentDTO> replyDTOs = new ArrayList<>(comment.getReplies()).stream()
                    .sorted(Comparator.comparing(ProblemComment::getCreatedAt).reversed())
                    .map(r -> mapToDTO(r, userVoteMap, false))
                    .collect(Collectors.toList());
            dto.setReplies(replyDTOs);
        }

        return dto;
    }
}
