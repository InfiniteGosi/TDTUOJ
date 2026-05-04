package com.oj.TDTUOJ.problemComment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.oj.TDTUOJ.common.enums.VoteType;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class VoteRequestDTO {
    private VoteType voteType; // UPVOTE or DOWNVOTE
}
