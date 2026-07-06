package com.oj.TDTUOJ.lab.entity;

import com.oj.TDTUOJ.organization.entity.Organization;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * A lab is a graded assignment scoped to a single {@link Organization} — a
 * lecturer bundles a set of problems (exercises) with per-problem points and
 * an optional deadline, and students in the org work through them.
 *
 * <p>Slug uniqueness is per-organization (the {@code (organization_id, slug)}
 * unique constraint), so two different orgs may reuse the same slug.
 */
@Entity
@Data
@Table(name = "labs",
       uniqueConstraints = @UniqueConstraint(columnNames = {"organization_id", "slug"}))
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Lab {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Owning organization; a lab is only visible/manageable within this org.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Organization organization;

    // The lecturer who created the lab (nullable so the lab survives creator deletion).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User creator;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDateTime deadline;

    // Gate for revealing reference solutions to students: while false, exercise
    // DTOs strip out solution code/files even for solved problems. Toggled by the owner.
    @Builder.Default
    @Column(nullable = false)
    private Boolean solutionsPublished = false;

    // Ordered exercises; cascade + orphanRemoval means clearing this list on
    // update deletes the underlying LabExercise rows (see LabServiceImpl.updateLab).
    @OneToMany(mappedBy = "lab", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<LabExercise> exercises = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
