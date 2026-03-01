package com.oj.TDTUOJ.problemTag.service;

import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.problemTag.dto.TagDTO;
import com.oj.TDTUOJ.problemTag.entity.Tag;
import com.oj.TDTUOJ.problemTag.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;

    private final ModelMapper modelMapper;

    @Override
    public Response<TagDTO> createTag(TagDTO tagDTO) {
        if (tagRepository.existsByName(tagDTO.getName())) {
            throw new BadRequestException("Tag with name '" + tagDTO.getName() + "' already exists");
        }

        Tag tag = Tag.builder()
                .name(tagDTO.getName())
                .isActive(tagDTO.getIsActive() != null ? tagDTO.getIsActive() : true)
                .build();

        Tag savedTag = tagRepository.save(tag);

        return Response.<TagDTO>builder()
                .statusCode(HttpStatus.CREATED.value())
                .message("Tag created successfully")
                .data(modelMapper.map(savedTag, TagDTO.class))
                .build();
    }

    @Override
    public Response<TagDTO> updateTag(TagDTO tagDTO) {
        Tag existingTag = tagRepository.findById(tagDTO.getId())
                .orElseThrow(() -> new NotFoundException("Tag not found with id: " + tagDTO.getId()));

        if (!existingTag.getName().equals(tagDTO.getName()) &&
                tagRepository.existsByName(tagDTO.getName())) {
            throw new BadRequestException("Tag with name '" + tagDTO.getName() + "' already exists");
        }

        existingTag.setName(tagDTO.getName());
        log.info(tagDTO.getIsActive().toString());
        if (tagDTO.getIsActive() != null) {
            existingTag.setIsActive(tagDTO.getIsActive());
        }

        Tag updatedTag = tagRepository.save(existingTag);

        return Response.<TagDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Tag updated successfully")
                .data(modelMapper.map(updatedTag, TagDTO.class))
                .build();
    }

    @Override
    public Response<TagDTO> getTagById(Long id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Tag not found with id: " + id));

        return Response.<TagDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Tag retrieved successfully")
                .data(modelMapper.map(tag, TagDTO.class))
                .build();
    }

    @Override
    public Response<Page<TagDTO>> getAllTags(Integer limit, Integer offset, String sortField,
                                             String direction, String name) {
        if (limit == null || limit <= 0) limit = 20;
        if (offset == null || offset < 0) offset = 0;
        if (sortField == null || sortField.isBlank()) sortField = "id";
        if (direction == null || direction.isBlank()) direction = "asc";

        Sort sort = Sort.by(Sort.Direction.fromString(direction), sortField);
        int page = offset / limit;
        Pageable pageable = PageRequest.of(page, limit, sort);

        Page<Tag> tagPage;

        if (name != null && !name.isBlank()) {
            tagPage = tagRepository.findByNameContainingIgnoreCase(name, pageable);
        } else {
            tagPage = tagRepository.findAll(pageable);
        }

        Page<TagDTO> pageDTO = tagPage.map(tag -> modelMapper.map(tag, TagDTO.class));

        return Response.<Page<TagDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Tags retrieved successfully")
                .data(pageDTO)
                .build();
    }

    @Override
    public Response<?> deleteTag(Long id) {
        if (!tagRepository.existsById(id)) {
            throw new NotFoundException("Tag not found with id: " + id);
        }

        tagRepository.deleteById(id);

        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Tag deleted successfully")
                .build();
    }

    @Override
    public Response<TagDTO> toggleTagActive(Long id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Tag not found with id: " + id));

        tag.setIsActive(!Boolean.TRUE.equals(tag.getIsActive()));
        Tag saved = tagRepository.save(tag);

        return Response.<TagDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Tag status updated successfully")
                .data(modelMapper.map(saved, TagDTO.class))
                .build();
    }
}
