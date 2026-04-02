package com.oj.TDTUOJ.contest.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.common.enums.ContestRegistrationStatus;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Data
@Table(
        name = "contest_registration",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "contest_id"})
)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ContestRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Contest contest;

    @CreationTimestamp
    private LocalDateTime registerAt;

    // PENDING, APPROVED, REJECTED, CANCELLED
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ContestRegistrationStatus status = ContestRegistrationStatus.APPROVED;
}