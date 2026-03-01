package com.oj.TDTUOJ.problemTag.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problemTag.dto.TagDTO;
import com.oj.TDTUOJ.problemTag.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/problem-tags")
@PreAuthorize("hasAuthority('ADMIN')")
public class TagController {
    private final TagService tagService;

    @GetMapping
    public ResponseEntity<Response<Page<TagDTO>>> getAllTags(
            @RequestParam(defaultValue = "20") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset,
            @RequestParam(defaultValue = "id") String sortField,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String name) {
        return ResponseEntity.ok(tagService.getAllTags(limit, offset, sortField, direction, name));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Response<TagDTO>> getTagById(@PathVariable Long id) {
        return ResponseEntity.ok(tagService.getTagById(id));
    }

    @PostMapping
    public ResponseEntity<Response<TagDTO>> createTag(@RequestBody @Valid TagDTO tagDTO) {
        return ResponseEntity.ok(tagService.createTag(tagDTO));
    }

    @PutMapping
    public ResponseEntity<Response<TagDTO>> updateTag(@RequestBody @Valid TagDTO tagDTO) {
        return ResponseEntity.ok(tagService.updateTag(tagDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Response<?>> deleteTag(@PathVariable Long id) {
        return ResponseEntity.ok(tagService.deleteTag(id));
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<Response<TagDTO>> toggleTagActive(@PathVariable Long id) {
        return ResponseEntity.ok(tagService.toggleTagActive(id));
    }
}
