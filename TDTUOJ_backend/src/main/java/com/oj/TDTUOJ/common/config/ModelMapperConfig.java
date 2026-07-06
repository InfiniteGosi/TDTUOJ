package com.oj.TDTUOJ.common.config;

import com.oj.TDTUOJ.problem.dto.ProblemDTO;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problemTag.dto.TagDTO;
import com.oj.TDTUOJ.problemTag.entity.Tag;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeMap;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides the shared {@link ModelMapper} used across modules for entity ↔ DTO conversion.
 */
@Configuration
public class ModelMapperConfig {
    @Bean
    public ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        // Match on private fields with the STANDARD strategy: entities/DTOs expose data through
        // Lombok-generated accessors, and field-level matching avoids surprises from loose
        // (LOOSE strategy) name matching mapping unintended properties.
        modelMapper.getConfiguration()
                .setFieldMatchingEnabled(true)
                .setFieldAccessLevel(org.modelmapper.config.Configuration.AccessLevel.PRIVATE)
                .setMatchingStrategy(MatchingStrategies.STANDARD);

        // Tag -> TagDTO (still using ModelMapper since Tag has no lazy-loaded fields)
        modelMapper.createTypeMap(Tag.class, TagDTO.class);

        return modelMapper;
    }
}
