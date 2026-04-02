package com.oj.TDTUOJ.contest.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.common.enums.ContestParticipationType;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Data
@Table(
        name = "contest_participations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "contest_id"})
)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ContestParticipation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    // Derived rank — recomputed after each accepted submission
    @Builder.Default
    private Integer rank = 0;

    // Total score accumulated in the contest
    @Builder.Default
    private Integer score = 0;

    // ICPC-style: sum of minutes elapsed at each accepted submission + 20 min per wrong attempt
    @Builder.Default
    private Integer penaltyTime = 0;

    @Builder.Default
    private Integer problemsSolved = 0;

    @Builder.Default
    private Integer pointsEarned = 0;

    // CONTESTANT or VIRTUAL (for virtual participation after contest ends)
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ContestParticipationType type = ContestParticipationType.CONTESTANT;

    // Snapshot of rating before contest — filled when contest is finalized
    private Integer ratingBefore;

    // Snapshot of rating after contest — filled when contest is finalized
    private Integer ratingAfter;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}