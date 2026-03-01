package com.oj.TDTUOJ.problemTag.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

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
