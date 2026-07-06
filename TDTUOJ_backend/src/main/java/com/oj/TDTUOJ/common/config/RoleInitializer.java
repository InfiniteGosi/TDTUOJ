package com.oj.TDTUOJ.common.config;

import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the fixed set of application roles (ADMIN, CREATOR, PARTICIPANT) on first startup.
 *
 * <p>Runs as a {@link CommandLineRunner} so the roles exist before any user is created,
 * since role lookups are required during registration and JWT authorization.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RoleInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;

    /** Populates default roles only when the table is empty, making startup idempotent. */
    @Override
    public void run(String... args) throws Exception {
        // Guard on count so re-deploys against an existing DB don't create duplicate roles.
        if (roleRepository.count() == 0) {
            log.info("No roles found. Initializing default roles...");

            createRole("ADMIN");
            createRole("CREATOR");
            createRole("PARTICIPANT");
        }
        else {
            log.info("Roles already exist (count: {}). Skipping initialization.", roleRepository.count());
        }
    }

    private void createRole(String roleName) {
        Role role = Role.builder()
                .name(roleName)
                .build();

        roleRepository.save(role);
    }
}
