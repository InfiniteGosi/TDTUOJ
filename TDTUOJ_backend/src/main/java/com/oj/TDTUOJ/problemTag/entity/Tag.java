package com.oj.TDTUOJ.problemTag.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

/**
 * A problem category/label (e.g. "array", "dynamic-programming") that can be attached to problems.
 *
 * <p>{@code name} is unique. {@code isActive} acts as a soft on/off switch so a tag can be hidden
 * from selection without deleting it (and losing its existing problem associations).</p>
 */
@Entity
@Data
@Table(name = "tags")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Tag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String name;

    private Boolean isActive;
}
