package com.oj.TDTUOJ.lab.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.lab.dto.CreateLabRequest;
import com.oj.TDTUOJ.lab.dto.LabDTO;
import com.oj.TDTUOJ.lab.dto.LabProgressDTO;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Business operations for labs. Read operations require org membership; all
 * mutations (create/update/delete/progress/publish) require the org OWNER role
 * (platform ADMIN bypasses). See {@code LabServiceImpl} for the guard details.
 */
public interface LabService {

    /** List labs in an org (any member). */
    Response<Page<LabDTO>> getLabsByOrg(Long orgId, int page, int size);

    /** Full lab detail including exercises (any member). */
    Response<LabDTO> getLabDetail(Long orgId, String slug);

    /** Create a lab with its exercises; owner-only. */
    Response<LabDTO> createLab(Long orgId, CreateLabRequest request);

    /** Replace a lab's metadata and re-sync its exercise list; owner-only. */
    Response<LabDTO> updateLab(Long orgId, Long labId, CreateLabRequest request);

    Response<Void> deleteLab(Long orgId, Long labId);

    /** Per-student progress table for the owner (excludes the owner themselves). */
    Response<List<LabProgressDTO>> getLabProgress(Long orgId, Long labId);

    /** Export the progress table as CSV or XLSX bytes; owner-only. */
    byte[] exportLabProgress(Long orgId, Long labId, String format);

    /** Toggle whether reference solutions are visible to students; owner-only. */
    Response<LabDTO> publishSolutions(Long orgId, Long labId);
}
