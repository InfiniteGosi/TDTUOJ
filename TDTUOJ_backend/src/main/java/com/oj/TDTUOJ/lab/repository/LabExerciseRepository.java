package com.oj.TDTUOJ.lab.repository;

import com.oj.TDTUOJ.lab.entity.LabExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** Data access for {@link LabExercise} rows (a lab's problems). */
@Repository
public interface LabExerciseRepository extends JpaRepository<LabExercise, Long> {

    // Exercises in display order — the canonical ordering used everywhere (detail view, progress, export columns).
    List<LabExercise> findByLabIdOrderByExerciseOrderAsc(Long labId);

    void deleteByLabId(Long labId);

    /** True if the problem is used as an exercise in any lab (students need the statement). */
    boolean existsByProblemId(Long problemId);

    /** Remove a problem from every lab (clears the FK before deleting the problem). */
    void deleteByProblemId(Long problemId);
}
