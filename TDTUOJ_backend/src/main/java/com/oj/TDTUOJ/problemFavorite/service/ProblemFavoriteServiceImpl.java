package com.oj.TDTUOJ.problemFavorite.service;

import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.problemFavorite.dto.ProblemFavoriteDTO;
import com.oj.TDTUOJ.problemFavorite.entity.ProblemFavorite;
import com.oj.TDTUOJ.problemFavorite.repository.ProblemFavoriteRepository;
import com.oj.TDTUOJ.problemTag.dto.TagDTO;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/** Default implementation of the bookmark/favorite service. */
@Service
@RequiredArgsConstructor
public class ProblemFavoriteServiceImpl implements ProblemFavoriteService {

    private final ProblemFavoriteRepository favoriteRepository;
    private final ProblemRepository problemRepository;
    private final UserService userService;

    @Override
    @Transactional(readOnly = true)
    public Response<List<ProblemDTO>> getFavoriteProblems() {
        User currentUser = userService.getCurrentLoggedInUser();

        List<ProblemDTO> favorites = favoriteRepository.findByUserId(currentUser.getId())
                .stream()
                .map(fav -> mapProblemToDTO(fav.getProblem()))
                .collect(Collectors.toList());

        return Response.<List<ProblemDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Favorite problems retrieved successfully")
                .data(favorites)
                .build();
    }

    /**
     * Idempotent toggle: if the (user, problem) bookmark already exists it is deleted,
     * otherwise it is created. The returned DTO's {@code isFavorited} reflects the resulting state.
     */
    @Override
    @Transactional
    public Response<ProblemFavoriteDTO> toggleFavorite(Long problemId) {
        User currentUser = userService.getCurrentLoggedInUser();

        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new NotFoundException("Problem not found with id: " + problemId));

        Optional<ProblemFavorite> existing = favoriteRepository
                .findByUserIdAndProblemId(currentUser.getId(), problemId);

        boolean isFavorited;
        ProblemFavoriteDTO dto = new ProblemFavoriteDTO();
        dto.setProblemId(problemId);
        dto.setUserId(currentUser.getId());

        if (existing.isPresent()) {
            // Remove favorite
            favoriteRepository.deleteByUserIdAndProblemId(currentUser.getId(), problemId);
            isFavorited = false;
        } else {
            // Add favorite
            ProblemFavorite saved = favoriteRepository.save(
                    ProblemFavorite.builder()
                            .user(currentUser)
                            .problem(problem)
                            .build());
            dto.setId(saved.getId());
            dto.setCreatedAt(saved.getCreatedAt());
            isFavorited = true;
        }

        dto.setIsFavorited(isFavorited);

        return Response.<ProblemFavoriteDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message(isFavorited ? "Problem added to favorites" : "Problem removed from favorites")
                .data(dto)
                .build();
    }

    /** Lightweight mapping — no test cases or solution code exposed in favorites list. */
    private ProblemDTO mapProblemToDTO(Problem problem) {
        ProblemDTO dto = new ProblemDTO();
        dto.setId(problem.getId());
        dto.setTitle(problem.getTitle());
        dto.setSlug(problem.getSlug());
        dto.setIsPublic(problem.getIsPublic());
        dto.setProblemDifficulty(problem.getProblemDifficulty());
        dto.setPoint(problem.getPoint());
        dto.setTimeLimit(problem.getTimeLimit());
        dto.setMemoryLimit(problem.getMemoryLimit());
        dto.setCreatedAt(problem.getCreatedAt());
        dto.setAuthorId(problem.getAuthor() != null ? problem.getAuthor().getId() : null);
        dto.setAuthorUserName(problem.getAuthor() != null ? problem.getAuthor().getUsername() : null);

        if (problem.getTags() != null) {
            dto.setTags(problem.getTags().stream()
                    .map(tag -> {
                        TagDTO tagDTO = new TagDTO();
                        tagDTO.setId(tag.getId());
                        tagDTO.setName(tag.getName());
                        tagDTO.setIsActive(tag.getIsActive());
                        return tagDTO;
                    })
                    .collect(Collectors.toSet()));
        }

        return dto;
    }
}
