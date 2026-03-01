package com.oj.TDTUOJ.problemTag.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problemTag.dto.TagDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TagService {
    Response<TagDTO> createTag(TagDTO tagDTO);
    Response<TagDTO> updateTag(TagDTO tagDTO);
    Response<TagDTO> getTagById(Long id);
    Response<Page<TagDTO>> getAllTags(Integer limit,
                                      Integer offset,
                                      String sortField,
                                      String direction,
                                      String name);
    Response<?> deleteTag(Long id);
    Response<TagDTO> toggleTagActive(Long id);
}
