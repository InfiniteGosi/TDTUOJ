package com.oj.TDTUOJ.problemTag.repository;

import com.oj.TDTUOJ.problemTag.entity.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Data access for {@link Tag} entities, including name-uniqueness checks and name search. */
@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {
    /** Guards the unique-name constraint before an insert/rename. */
    boolean existsByName(String name);

    Optional<Tag> findByName(String name);

    /**
     * Case-insensitive name lookup — used when resolving tag names submitted
     * by the frontend so that "array", "Array", and "ARRAY" all resolve to
     * the same stored tag regardless of how it was saved.
     */
    Optional<Tag> findByNameIgnoreCase(String name);

    /** Case-insensitive substring search, used by the admin tag list's name filter. */
    Page<Tag> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
