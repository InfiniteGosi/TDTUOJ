package com.oj.TDTUOJ.contest.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oj.TDTUOJ.contest.dto.LeaderboardDTO;
import com.oj.TDTUOJ.contest.dto.ScoreboardEntryDTO;
import com.oj.TDTUOJ.contest.entity.Contest;
import com.oj.TDTUOJ.contest.entity.ContestParticipation;
import com.oj.TDTUOJ.contest.entity.LeaderboardCache;
import com.oj.TDTUOJ.contest.repository.ContestParticipationRepository;
import com.oj.TDTUOJ.contest.repository.ContestProblemRepository;
import com.oj.TDTUOJ.contest.repository.ContestRepository;
import com.oj.TDTUOJ.contest.repository.LeaderboardCacheRepository;
import com.oj.TDTUOJ.common.enums.ContestParticipationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed leaderboard engine for ICPC-style contests.
 *
 * <h3>Redis key layout</h3>
 * <pre>
 *   contest:lb:{contestId}              — ZSET   member=userId, score=compositeScore
 *   contest:meta:{contestId}:{userId}  — HASH   username, profileUrl, penaltyTime,
 *                                                problemsSolved, type, lastUpdated
 *   contest:prob:{contestId}:{userId}  — HASH   per-problem JSON blobs keyed by problemId
 *   contest:lb:cache:{contestId}       — STRING  serialised LeaderboardDTO JSON (30 s TTL)
 * </pre>
 *
 * <h3>ICPC composite score</h3>
 * {@code compositeScore = problemsSolved * SCORE_MULTIPLIER - penaltyMinutes}
 * <p>
 * Redis ZSET sorts ascending by score, so we use {@code ZREVRANGE} to get
 * the highest-composite-score participant first (rank 1).
 * The multiplier (1 000 000) ensures that a participant with more problems
 * solved always outranks a participant with fewer, regardless of penalty.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContestLeaderboardService {

    // ── Redis key prefixes ────────────────────────────────────────────────── //
    private static final String LB_ZSET_KEY   = "contest:lb:";
    private static final String META_HASH_KEY = "contest:meta:";
    private static final String PROB_HASH_KEY = "contest:prob:";
    private static final String CACHE_KEY     = "contest:lb:cache:";

    // Cache TTL in seconds — clients should poll no faster than this
    private static final long CACHE_TTL_SECONDS = 30;

    /**
     * Multiplier used in the composite score so that solving one more problem
     * always beats any possible penalty reduction.
     * Max contest duration is typically 5 h = 300 min; with 20 min/wrong attempt
     * and at most ~100 problems, the max penalty is well under 1 000 000.
     */
    private static final long SCORE_MULTIPLIER = 1_000_000L;

    private final RedisTemplate<String, Object>  redisTemplate;
    private final ObjectMapper                   objectMapper;
    private final ContestRepository              contestRepository;
    private final ContestParticipationRepository participationRepository;
    private final ContestProblemRepository       contestProblemRepository;
    private final LeaderboardCacheRepository     leaderboardCacheRepository;
    private final LeaderboardCacheHelper         cacheHelper;

    // ── Public API ────────────────────────────────────────────────────────── //

    /**
     * Seeds the Redis ZSET from the DB.  Call once when a user makes their
     * first submission in a contest (lazy init) or on application startup
     * if the ZSET is missing.
     */
    @Transactional(readOnly = true)
    public void initLeaderboard(Long contestId) {
        String zsetKey = LB_ZSET_KEY + contestId;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(zsetKey))) return;

        List<ContestParticipation> participations =
                participationRepository.findByContestIdOrderByRankAsc(contestId);

        ZSetOperations<String, Object> zops = redisTemplate.opsForZSet();
        HashOperations<String, String, String> hops = redisTemplate.opsForHash();

        for (ContestParticipation p : participations) {
            long composite = computeCompositeScore(p.getProblemsSolved(), p.getPenaltyTime());
            zops.add(zsetKey, p.getUser().getId().toString(), composite);
            writeMeta(hops, contestId, p.getUser().getId(),
                    p.getUser().getUsername(), p.getUser().getProfileUrl(),
                    p.getPenaltyTime(), p.getProblemsSolved(), p.getType());
        }

        log.info("Initialised Redis leaderboard for contestId={} with {} entries",
                contestId, participations.size());
    }

    /**
     * Called by {@link com.oj.TDTUOJ.submission.service.SubmissionJudgeService}
     * after an accepted submission in a contest.
     *
     * @param contestId      contest the submission belongs to
     * @param userId         submitting user
     * @param username       display name (for Hash metadata)
     * @param profileUrl     avatar URL (for Hash metadata)
     * @param problemId      the problem that was just solved
     * @param problemOrder   display order (A=1, B=2, …)
     * @param penaltyMinutes cumulative penalty minutes AFTER this solve
     * @param problemsSolved cumulative problems solved count AFTER this solve
     * @param problemMeta    per-problem status to store
     */
    public void recordAcceptedSubmission(
            Long contestId,
            Long userId,
            String username,
            String profileUrl,
            Long problemId,
            Integer problemOrder,
            Integer penaltyMinutes,
            Integer problemsSolved,
            ScoreboardEntryDTO.ProblemScoreDTO problemMeta
    ) {
        String zsetKey = LB_ZSET_KEY + contestId;

        // Lazy-init: seed from DB if ZSET doesn't exist yet
        if (!Boolean.TRUE.equals(redisTemplate.hasKey(zsetKey))) {
            initLeaderboard(contestId);
        }

        long composite = computeCompositeScore(problemsSolved, penaltyMinutes);

        // Update ZSET score — ZADD with XX+GT is not universally available in
        // Spring's ZSetOperations, so we just call add() which does ZADD with
        // update-if-exists semantics (the score always increases as more problems
        // are solved, so this is safe).
        redisTemplate.opsForZSet().add(zsetKey, userId.toString(), composite);

        // Update metadata Hash
        HashOperations<String, String, String> hops = redisTemplate.opsForHash();
        writeMeta(hops, contestId, userId, username, profileUrl,
                penaltyMinutes, problemsSolved, ContestParticipationType.CONTESTANT);

        // Update per-problem Hash
        writeProblemStatus(hops, contestId, userId, problemId, problemMeta);

        // Invalidate the cached snapshot so the next GET rebuilds it
        redisTemplate.delete(CACHE_KEY + contestId);

        log.info("Leaderboard updated: contestId={} userId={} composite={}", contestId, userId, composite);

        // Persist rank snapshot to DB asynchronously
        persistRankAsync(contestId, userId, problemsSolved, penaltyMinutes, composite);
    }

    /**
     * Returns the full leaderboard for a contest, using a 30-second Redis cache.
     *
     * @param contestId contest to fetch
     * @param page      0-based page index
     * @param size      entries per page (0 = unlimited)
     */
    public LeaderboardDTO getLeaderboard(Long contestId, int page, int size) {
        // 1. Try the short-lived cached snapshot first
        String cacheKey = CACHE_KEY + contestId;
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached.toString(), LeaderboardDTO.class);
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialise cached leaderboard for contestId={}", contestId, e);
            }
        }

        // 2. Build from ZSET
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new com.oj.TDTUOJ.common.exceptions.NotFoundException(
                        "Contest not found: " + contestId));

        LeaderboardDTO leaderboard = buildLeaderboard(contest, page, size);

        // 3. Cache the full (unpaged) result for 30 s
        try {
            String json = objectMapper.writeValueAsString(leaderboard);
            redisTemplate.opsForValue().set(cacheKey, json, CACHE_TTL_SECONDS, TimeUnit.SECONDS);

            // Also persist to DB for durability (async, properly proxied)
            cacheHelper.persistSnapshot(contestId, json, leaderboard.getTotalParticipants());
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialise leaderboard for caching contestId={}", contestId, e);
        }

        return leaderboard;
    }

    /**
     * Returns a mini-view centred on the given user: their own entry plus the
     * {@code window} participants immediately above and below them.
     */
    public List<ScoreboardEntryDTO> getNeighbours(Long contestId, Long userId, int window) {
        String zsetKey = LB_ZSET_KEY + contestId;
        Long rank = redisTemplate.opsForZSet().reverseRank(zsetKey, userId.toString());
        if (rank == null) return Collections.emptyList();

        long from = Math.max(0, rank - window);
        long to   = rank + window;

        Set<ZSetOperations.TypedTuple<Object>> range =
                redisTemplate.opsForZSet().reverseRangeWithScores(zsetKey, from, to);
        if (range == null) return Collections.emptyList();

        HashOperations<String, String, String> hops = redisTemplate.opsForHash();
        List<ScoreboardEntryDTO> result = new ArrayList<>();
        int displayRank = (int) from + 1;

        for (ZSetOperations.TypedTuple<Object> tuple : range) {
            String memberId = tuple.getValue() == null ? "" : tuple.getValue().toString();
            ScoreboardEntryDTO entry = buildEntry(hops, contestId, Long.parseLong(memberId),
                    displayRank++, tuple.getScore());
            result.add(entry);
        }
        return result;
    }

    /**
     * Returns the 1-based rank of a user in a contest, or -1 if not ranked.
     */
    public long getUserRank(Long contestId, Long userId) {
        Long zeroBasedRank = redisTemplate.opsForZSet()
                .reverseRank(LB_ZSET_KEY + contestId, userId.toString());
        return zeroBasedRank == null ? -1L : zeroBasedRank + 1;
    }

    // ── Internal helpers ──────────────────────────────────────────────────── //

    private LeaderboardDTO buildLeaderboard(Contest contest, int page, int size) {
        String zsetKey = LB_ZSET_KEY + contest.getId();
        HashOperations<String, String, String> hops = redisTemplate.opsForHash();

        Long total = redisTemplate.opsForZSet().size(zsetKey);
        long totalParticipants = total == null ? 0L : total;

        long from, to;
        if (size <= 0) {
            from = 0;
            to   = -1; // all
        } else {
            from = (long) page * size;
            to   = from + size - 1;
        }

        Set<ZSetOperations.TypedTuple<Object>> tuples =
                redisTemplate.opsForZSet().reverseRangeWithScores(zsetKey, from, to);

        List<ScoreboardEntryDTO> entries = new ArrayList<>();
        if (tuples != null) {
            int rank = (int) from + 1;
            for (ZSetOperations.TypedTuple<Object> tuple : tuples) {
                String memberId = tuple.getValue() == null ? "" : tuple.getValue().toString();
                entries.add(buildEntry(hops, contest.getId(),
                        Long.parseLong(memberId), rank++, tuple.getScore()));
            }
        }

        return LeaderboardDTO.builder()
                .contestId(contest.getId())
                .contestName(contest.getName())
                .contestSlug(contest.getSlug())
                .totalParticipants((int) totalParticipants)
                .entries(entries)
                .lastUpdated(LocalDateTime.now())
                .build();
    }

    private ScoreboardEntryDTO buildEntry(
            HashOperations<String, String, String> hops,
            Long contestId, Long userId, int rank, Double compositeScore
    ) {
        String metaKey = META_HASH_KEY + contestId + ":" + userId;
        Map<String, String> meta = hops.entries(metaKey);

        ScoreboardEntryDTO entry = new ScoreboardEntryDTO();
        entry.setRank(rank);
        entry.setUserId(userId);
        entry.setUsername(meta.getOrDefault("username", ""));
        entry.setProfileUrl(meta.get("profileUrl"));
        entry.setPenaltyTime(parseInt(meta.get("penaltyTime")));
        entry.setProblemsSolved(parseInt(meta.get("problemsSolved")));
        entry.setType(ContestParticipationType.valueOf(
                meta.getOrDefault("type", ContestParticipationType.CONTESTANT.name())));

        // Derive score from composite (reverse the formula)
        int solved  = entry.getProblemsSolved() == null ? 0 : entry.getProblemsSolved();
        entry.setScore(solved); // In ICPC, "score" = problems solved

        // Per-problem statuses
        String probKey = PROB_HASH_KEY + contestId + ":" + userId;
        Map<String, String> probMap = hops.entries(probKey);
        List<ScoreboardEntryDTO.ProblemScoreDTO> problemScores = new ArrayList<>();
        probMap.forEach((problemId, json) -> {
            try {
                problemScores.add(objectMapper.readValue(json, ScoreboardEntryDTO.ProblemScoreDTO.class));
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse problem status userId={} problemId={}", userId, problemId, e);
            }
        });
        problemScores.sort(Comparator.comparingInt(p -> (p.getProblemOrder() == null ? 0 : p.getProblemOrder())));
        entry.setProblemScores(problemScores);

        return entry;
    }

    private void writeMeta(
            HashOperations<String, String, String> hops,
            Long contestId, Long userId,
            String username, String profileUrl,
            Integer penaltyTime, Integer problemsSolved,
            ContestParticipationType type
    ) {
        String metaKey = META_HASH_KEY + contestId + ":" + userId;
        Map<String, String> fields = new HashMap<>();
        fields.put("username",       username  != null ? username  : "");
        fields.put("profileUrl",     profileUrl != null ? profileUrl : "");
        fields.put("penaltyTime",    String.valueOf(penaltyTime  != null ? penaltyTime  : 0));
        fields.put("problemsSolved", String.valueOf(problemsSolved != null ? problemsSolved : 0));
        fields.put("type",           type != null ? type.name() : ContestParticipationType.CONTESTANT.name());
        fields.put("lastUpdated",    LocalDateTime.now().toString());
        hops.putAll(metaKey, fields);
    }

    private void writeProblemStatus(
            HashOperations<String, String, String> hops,
            Long contestId, Long userId,
            Long problemId, ScoreboardEntryDTO.ProblemScoreDTO dto
    ) {
        String probKey = PROB_HASH_KEY + contestId + ":" + userId;
        try {
            hops.put(probKey, problemId.toString(), objectMapper.writeValueAsString(dto));
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialise problem status for problemId={}", problemId, e);
        }
    }

    /**
     * Persist rank & score snapshot to DB asynchronously (fire-and-forget).
     * Runs in the async thread pool defined by {@link com.oj.TDTUOJ.common.config.AsyncConfig}.
     */
    @Async("leaderboardExecutor")
    @Transactional
    public void persistRankAsync(Long contestId, Long userId,
                                 Integer problemsSolved, Integer penaltyTime,
                                 long compositeScore) {
        long rank = getUserRank(contestId, userId);
        participationRepository.updateScoreAndRank(
                contestId, userId, (int) rank,
                problemsSolved,   // score = problems solved in ICPC
                penaltyTime,
                problemsSolved
        );
    }

    // persistSnapshotAsync removed — logic moved to LeaderboardCacheHelper
    // to allow Spring to properly proxy @Async + @Transactional (self-invocation
    // within the same bean bypasses both annotations).

    private static long computeCompositeScore(Integer problemsSolved, Integer penaltyMinutes) {
        long solved  = problemsSolved  != null ? problemsSolved  : 0L;
        long penalty = penaltyMinutes  != null ? penaltyMinutes  : 0L;
        return solved * SCORE_MULTIPLIER - penalty;
    }

    private static Integer parseInt(String value) {
        if (value == null) return 0;
        try { return Integer.parseInt(value); } catch (NumberFormatException e) { return 0; }
    }
}
