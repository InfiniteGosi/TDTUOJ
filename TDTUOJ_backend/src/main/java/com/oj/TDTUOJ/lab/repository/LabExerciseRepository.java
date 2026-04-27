package com.oj.TDTUOJ.lab.repository;

import com.oj.TDTUOJ.lab.entity.LabExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabExerciseRepository extends JpaRepository<LabExercise, Long> {

    List<LabExercise> findByLabIdOrderByExerciseOrderAsc(Long labId);

    void deleteByLabId(Long labId);
}
