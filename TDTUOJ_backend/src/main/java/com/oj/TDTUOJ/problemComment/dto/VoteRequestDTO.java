package com.oj.TDTUOJ.problemComment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.oj.TDTUOJ.common.enums.VoteType;
import lombok.Data;

/** Request body for casting a vote on a comment; carries the intended {@link VoteType}. */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class VoteRequestDTO {
    private VoteType voteType; // UPVOTE or DOWNVOTE
}
