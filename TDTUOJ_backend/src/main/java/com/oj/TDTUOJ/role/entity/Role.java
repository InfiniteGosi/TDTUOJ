package com.oj.TDTUOJ.role.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A grantable authority. Seeded on startup by {@code RoleInitializer} with the
 * three system roles (ADMIN, CREATOR, PARTICIPANT) and referenced by users to
 * drive Spring Security's {@code @PreAuthorize} checks.
 */
@Entity
@Data
@Table(name = "roles")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique so a role name maps to exactly one authority.
    @Column(unique = true)
    private String name;
}
