package com.oj.TDTUOJ.role.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.role.dto.RoleDTO;

import java.util.List;

/** Admin-only CRUD over the {@link com.oj.TDTUOJ.role.entity.Role} table. */
public interface RoleService {
    Response<RoleDTO> createRole(RoleDTO roleDTO);
    Response<RoleDTO> updateRole(RoleDTO roleDTO);
    Response<List<RoleDTO>> getAllRoles();
    Response<?> deleteRole(Long id);
}
