package com.oj.TDTUOJ.user.repository;

import com.oj.TDTUOJ.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Page<User> findByNameContainingIgnoreCase(String username, Pageable pageable);
}
