package com.oj.TDTUOJ.role.repository;

import com.oj.TDTUOJ.role.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** JPA access to {@link Role}. */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    // Lookup by name — used during login/authority resolution and by RoleInitializer seeding.
    Optional<Role> findByName(String name);
}
