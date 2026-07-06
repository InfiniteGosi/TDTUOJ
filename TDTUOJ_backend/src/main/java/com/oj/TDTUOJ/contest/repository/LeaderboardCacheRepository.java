package com.oj.TDTUOJ.contest.repository;

import com.oj.TDTUOJ.contest.entity.LeaderboardCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Data access for the durable {@link LeaderboardCache} snapshot (survives Redis restarts). */
@Repository
public interface LeaderboardCacheRepository extends JpaRepository<LeaderboardCache, Long> {

    Optional<LeaderboardCache> findByType(String type);

    /**
     * Atomic upsert — avoids the duplicate-key race condition that occurs when
     * two concurrent requests both try to INSERT a new row for the same {@code type}.
     */
    @Modifying
    @Query(value = """
            INSERT INTO leaderboard_cache (type, rankings, total_users, last_updated)
            VALUES (:type, :rankings, :totalUsers, NOW())
            ON CONFLICT (type) DO UPDATE
                SET rankings     = EXCLUDED.rankings,
                    total_users  = EXCLUDED.total_users,
                    last_updated = NOW()
            """, nativeQuery = true)
    void upsert(@Param("type") String type,
                @Param("rankings") String rankings,
                @Param("totalUsers") int totalUsers);
}
