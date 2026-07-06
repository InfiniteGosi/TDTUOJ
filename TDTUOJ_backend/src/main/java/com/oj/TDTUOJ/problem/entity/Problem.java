package com.oj.TDTUOJ.problem.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oj.TDTUOJ.common.enums.ProblemDifficulty;
import com.oj.TDTUOJ.problemFavorite.entity.ProblemFavorite;
import com.oj.TDTUOJ.problemTag.entity.Tag;
import com.oj.TDTUOJ.submission.entity.Submission;
import com.oj.TDTUOJ.testcase.entity.TestCase;
import com.oj.TDTUOJ.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * JPA entity for a competitive-programming problem.
 *
 * <p>Central aggregate of the judge: owns its test cases, submissions, tags and
 * favorites. The {@code slug} is a URL-friendly unique key derived from the title
 * (see {@code ProblemSlugUtils} / {@code ProblemServiceImpl}), used in place of the
 * numeric id in public URLs.</p>
 *
 * <p>The {@code isPublic} flag is the visibility guard that separates the open
 * public problem set from private/lecturer-repository problems (e.g. problems being
 * prepared for a contest or lab). Public listings must always filter on it.</p>
 */
@Entity
@Data
@Table(name = "problems")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Problem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String title;

    @Column(unique = true)
    private String slug;

    // Visibility guard. true → listed in the public problem set; false → private
    // (lecturer repo / contest / lab). Contest problems auto-publish when the contest ends.
    @Builder.Default
    private Boolean isPublic = true; // for private contests

    // Owning lecturer/admin. LAZY + @JsonIgnore to avoid loading and serializing the
    // whole User graph (which would recurse back into problems) on every response.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    @JsonIgnore  // Prevent circular reference
    private User author;

    @Enumerated(EnumType.STRING) // Added this!
    @Column(name = "problem_difficulty", length = 20)
    private ProblemDifficulty problemDifficulty;

    private String statementFileUrl; // S3 URL to problem statement (.md file)

    private String solutionFileUrl;  // S3 URL to solution (.md file), set by author

    @Column(columnDefinition = "TEXT")
    private String solutionCode;     // Plain-text solution source code

    private String solutionLanguage; // e.g. "CPP", "JAVA", "PYTHON", "C"

    private Integer point;

    private Double timeLimit; // in seconds

    private Integer memoryLimit; // in KB

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TestCase> testCases;

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Submission> submissions;

    // Tags are fetched EAGERly (small set) so listings can filter/display them without
    // extra queries. @JsonIgnore + exclude from toString/equals to break the M:N cycle;
    // the DTO layer serializes tags explicitly instead.
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "problems_tags",
            joinColumns = @JoinColumn(name = "problem_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @JsonIgnore
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Tag> tags = new HashSet<>();

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProblemFavorite> favorites = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
