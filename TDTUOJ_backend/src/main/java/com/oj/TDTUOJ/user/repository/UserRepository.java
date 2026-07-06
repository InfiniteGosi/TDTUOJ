package com.oj.TDTUOJ.user.repository;

import com.oj.TDTUOJ.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Data access for {@link User}. Beyond CRUD, provides the auth lookups (by
 * email / provider), leaderboard and org-search queries, and the admin-dashboard
 * registration aggregates.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);        // login + JWT subject resolution
    Optional<User> findByUsername(String username);  // public profile lookup (username is the slug)
    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);
    boolean existsByEmail(String email);             // registration uniqueness guard
    boolean existsByUsername(String username);       // registration uniqueness guard
    // Locate a federated account by its external provider identity (auth-provider linking).
    Optional<User> findByProviderIdAndAuthProvider(String providerId, String authProvider);

    /**
     * Leaderboard listing: all users, with an optional username filter.
     * LEFT JOIN to UserStatistics so users without a stats row still appear.
     * Sort by point/rating is supplied via JpaSort.unsafe referencing alias "s"
     * (e.g. "s.totalPoints", "s.currentRating") since those fields live on
     * UserStatistics, not User.
     * Pass "" for username to match all (avoids null-param type inference issues
     * on PostgreSQL, where a null bind triggers "function lower(bytea) does not exist").
     */
    @Query("SELECT u FROM User u LEFT JOIN UserStatistics s ON s.userId = u.id " +
           "WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :username, '%'))")
    Page<User> findAllForLeaderboard(@Param("username") String username, Pageable pageable);

    /** Search users NOT in a given org, by username. */
    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "AND u.id NOT IN (SELECT m.user.id FROM OrganizationMember m WHERE m.organization.id = :orgId)")
    Page<User> findNonMembersByUsername(@Param("orgId") Long orgId, @Param("q") String query, Pageable pageable);

    // ── Admin dashboard aggregates ────────────────────────────────────────── //

    /** Registrations per month ("YYYY-MM") since a given time (admin dashboard). */
    @Query("SELECT FUNCTION('to_char', u.createdAt, 'YYYY-MM'), COUNT(u) FROM User u " +
           "WHERE u.createdAt >= :since " +
           "GROUP BY FUNCTION('to_char', u.createdAt, 'YYYY-MM') " +
           "ORDER BY FUNCTION('to_char', u.createdAt, 'YYYY-MM')")
    List<Object[]> countRegistrationsByMonth(@Param("since") LocalDateTime since);

    /** Registrations per day ("YYYY-MM-DD") across all time (admin dashboard). */
    @Query("SELECT FUNCTION('to_char', u.createdAt, 'YYYY-MM-DD'), COUNT(u) FROM User u " +
           "GROUP BY FUNCTION('to_char', u.createdAt, 'YYYY-MM-DD') " +
           "ORDER BY FUNCTION('to_char', u.createdAt, 'YYYY-MM-DD')")
    List<Object[]> countRegistrationsByDay();

    /** Earliest registration timestamp — start of the all-time cumulative curve. */
    @Query("SELECT MIN(u.createdAt) FROM User u")
    LocalDateTime findEarliestCreatedAt();

    /** Users registered before a given time — seeds the cumulative curve (admin dashboard). */
    long countByCreatedAtBefore(LocalDateTime time);
}
