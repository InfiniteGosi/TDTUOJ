package com.oj.TDTUOJ.lab.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.lab.dto.CreateLabRequest;
import com.oj.TDTUOJ.lab.dto.LabDTO;
import com.oj.TDTUOJ.lab.dto.LabProgressDTO;
import org.springframework.data.domain.Page;

import java.util.List;

public interface LabService {

    Response<Page<LabDTO>> getLabsByOrg(Long orgId, int page, int size);

    Response<LabDTO> getLabDetail(Long orgId, String slug);

    Response<LabDTO> createLab(Long orgId, CreateLabRequest request);

    Response<LabDTO> updateLab(Long orgId, Long labId, CreateLabRequest request);

    Response<Void> deleteLab(Long orgId, Long labId);

    Response<List<LabProgressDTO>> getLabProgress(Long orgId, Long labId);

    byte[] exportLabProgress(Long orgId, Long labId, String format);

    Response<LabDTO> publishSolutions(Long orgId, Long labId);
}
