package com.oj.TDTUOJ.config;

import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class RoleInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) throws Exception {
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
