package com.oj.TDTUOJ.user.repository;

import com.oj.TDTUOJ.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    Optional<User> findByProviderIdAndAuthProvider(String providerId, String authProvider);

    /** Search users NOT in a given org, by username. */
    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "AND u.id NOT IN (SELECT m.user.id FROM OrganizationMember m WHERE m.organization.id = :orgId)")
    Page<User> findNonMembersByUsername(@Param("orgId") Long orgId, @Param("q") String query, Pageable pageable);
}
