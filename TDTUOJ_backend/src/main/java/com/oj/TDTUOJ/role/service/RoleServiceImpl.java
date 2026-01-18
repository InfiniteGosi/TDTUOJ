package com.oj.TDTUOJ.role.service;

import com.oj.TDTUOJ.exceptions.BadRequestException;
import com.oj.TDTUOJ.exceptions.NotFoundException;
import com.oj.TDTUOJ.response.Response;
import com.oj.TDTUOJ.role.dto.RoleDTO;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.role.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleServiceImpl implements RoleService {
    private final RoleRepository roleRepository;
    private final ModelMapper modelMapper;

    @Override
    public Response<RoleDTO> createRole(RoleDTO roleDTO) {
        // Convert DTO to entity
        Role role = modelMapper.map(roleDTO, Role.class);
        // Save the new role in the database
        Role savedRole = roleRepository.save(role);

        // Build and return a success response with the saved role mapped back to DTO
        return Response.<RoleDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Role created successfully")
                .data(modelMapper.map(savedRole, RoleDTO.class))
                .build();
    }

    @Override
    public Response<RoleDTO> updateRole(RoleDTO roleDTO) {
        // Fetch the existing role or throw exception if not found
        Role existingRole = roleRepository.findById(roleDTO.getId())
                .orElseThrow(() -> new NotFoundException("Role not found"));

        // Ensure role name is unique (throw exception if it already exists)
        if (roleRepository.findByName(roleDTO.getName()).isPresent()) {
            throw new BadRequestException("Role name already exists");
        }

        // Update role details and save changes
        existingRole.setName(roleDTO.getName());
        Role updatedRole = roleRepository.save(existingRole);

        // Build and return a success response with updated role
        return Response.<RoleDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Role updated successfully")
                .data(modelMapper.map(updatedRole, RoleDTO.class))
                .build();
    }

    @Override
    public Response<List<RoleDTO>> getAllRoles() {
        // Fetch all roles
        List<Role> roles = roleRepository.findAll();
        // Convert entities to DTOs
        List<RoleDTO> roleDTOS = roles.stream()
                .map(role -> modelMapper.map(role, RoleDTO.class)).toList();

        // Build and return a success response with role list
        return Response.<List<RoleDTO>>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Roles retrieved successfully")
                .data(roleDTOS)
                .build();
    }

    @Override
    public Response<?> deleteRole(Long id) {
        // Check if the role exists, throw exception if not
        if (!roleRepository.existsById(id)) {
            throw new NotFoundException("Role not found");
        }

        // Delete the role
        roleRepository.deleteById(id);

        // Build and return a success response without data
        return Response.builder()
                .statusCode(HttpStatus.OK.value())
                .message("Role deleted successfully")
                .build();
    }
}
