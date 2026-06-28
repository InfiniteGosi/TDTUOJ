package com.oj.TDTUOJ.status.service;

import com.oj.TDTUOJ.status.dto.JudgeStatusResponse;

public interface StatusService {

    /** Current health of the Judge0 engine. Cached briefly; never throws on Judge0 failure. */
    JudgeStatusResponse getJudgeStatus();
}
