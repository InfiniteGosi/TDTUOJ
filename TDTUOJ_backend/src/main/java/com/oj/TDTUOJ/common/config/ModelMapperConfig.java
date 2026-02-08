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

@Configuration
public class ModelMapperConfig {
    @Bean
    public ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration()
                .setFieldMatchingEnabled(true)
                .setFieldAccessLevel(org.modelmapper.config.Configuration.AccessLevel.PRIVATE)
                .setMatchingStrategy(MatchingStrategies.STANDARD);

        // Configure Problem -> ProblemDTO mapping
        TypeMap<Problem, ProblemDTO> problemTypeMap =
                modelMapper.createTypeMap(Problem.class, ProblemDTO.class);

        // Custom mappings
        problemTypeMap.addMappings(mapper -> {
            // Map author fields
            mapper.map(src -> src.getAuthor() != null ? src.getAuthor().getId() : null,
                    ProblemDTO::setAuthorId);
            mapper.map(src -> src.getAuthor() != null ? src.getAuthor().getUsername() : null,
                    ProblemDTO::setAuthorUsername);
            mapper.map(src -> src.getAuthor() != null ? src.getAuthor().getName() : null,
                    ProblemDTO::setAuthorName);
        });

        // Configure Tag -> TagDTO mapping
        TypeMap<Tag, TagDTO> tagTypeMap =
                modelMapper.createTypeMap(Tag.class, TagDTO.class);

        return modelMapper;
    }
}
