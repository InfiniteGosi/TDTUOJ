package com.oj.TDTUOJ.contest.entity;

import com.oj.TDTUOJ.common.enums.ContestStyle;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@Table(name = "contests")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Contest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(unique = true, nullable = false)
    private String slug;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Builder.Default
    private Boolean isPublic = true;

    @Builder.Default
    private Boolean isRated = false;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean ratingProcessed = false;

    private Integer maxParticipant;

    private LocalDateTime registrationStart;

    private LocalDateTime registrationEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "contest_style", length = 20)
    private ContestStyle contestStyle;  // e.g. ICPC, IOI, AtCoder

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    private User creator;

    @OneToMany(mappedBy = "contest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ContestProblem> contestProblems = new ArrayList<>();

    @OneToMany(mappedBy = "contest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ContestRegistration> registrations = new ArrayList<>();

    @OneToMany(mappedBy = "contest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ContestParticipation> participations = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}