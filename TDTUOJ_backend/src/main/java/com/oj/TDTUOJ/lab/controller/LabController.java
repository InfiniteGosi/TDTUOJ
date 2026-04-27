package com.oj.TDTUOJ.lab.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.lab.dto.CreateLabRequest;
import com.oj.TDTUOJ.lab.dto.LabDTO;
import com.oj.TDTUOJ.lab.dto.LabProgressDTO;
import com.oj.TDTUOJ.lab.service.LabService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/organizations/{orgId}/labs")
public class LabController {

    private final LabService labService;

    // ── List / Detail ─────────────────────────────────────────────────────── //

    @GetMapping
    public ResponseEntity<Response<Page<LabDTO>>> getLabs(
            @PathVariable Long orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(labService.getLabsByOrg(orgId, page, size));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Response<LabDTO>> getLabDetail(
            @PathVariable Long orgId,
            @PathVariable String slug
    ) {
        return ResponseEntity.ok(labService.getLabDetail(orgId, slug));
    }

    // ── CRUD ──────────────────────────────────────────────────────────────── //

    @PostMapping
    public ResponseEntity<Response<LabDTO>> createLab(
            @PathVariable Long orgId,
            @Valid @RequestBody CreateLabRequest request
    ) {
        Response<LabDTO> response = labService.createLab(orgId, request);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    @PutMapping("/{labId}")
    public ResponseEntity<Response<LabDTO>> updateLab(
            @PathVariable Long orgId,
            @PathVariable Long labId,
            @Valid @RequestBody CreateLabRequest request
    ) {
        return ResponseEntity.ok(labService.updateLab(orgId, labId, request));
    }

    @DeleteMapping("/{labId}")
    public ResponseEntity<Response<Void>> deleteLab(
            @PathVariable Long orgId,
            @PathVariable Long labId
    ) {
        return ResponseEntity.ok(labService.deleteLab(orgId, labId));
    }

    // ── Progress & Export ─────────────────────────────────────────────────── //

    @GetMapping("/{labId}/progress")
    public ResponseEntity<Response<List<LabProgressDTO>>> getProgress(
            @PathVariable Long orgId,
            @PathVariable Long labId
    ) {
        return ResponseEntity.ok(labService.getLabProgress(orgId, labId));
    }

    @GetMapping("/{labId}/export")
    public ResponseEntity<byte[]> exportProgress(
            @PathVariable Long orgId,
            @PathVariable Long labId,
            @RequestParam(defaultValue = "csv") String format
    ) {
        byte[] data = labService.exportLabProgress(orgId, labId, format);

        String filename;
        MediaType mediaType;
        if ("xlsx".equalsIgnoreCase(format) || "xls".equalsIgnoreCase(format)) {
            filename = "lab-progress.xlsx";
            mediaType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        } else {
            filename = "lab-progress.csv";
            mediaType = MediaType.parseMediaType("text/csv");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(data);
    }

    // ── Solutions ─────────────────────────────────────────────────────────── //

    @PostMapping("/{labId}/publish-solutions")
    public ResponseEntity<Response<LabDTO>> publishSolutions(
            @PathVariable Long orgId,
            @PathVariable Long labId
    ) {
        return ResponseEntity.ok(labService.publishSolutions(orgId, labId));
    }
}
