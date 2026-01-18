package com.oj.TDTUOJ.role.service;

import com.oj.TDTUOJ.response.Response;
import com.oj.TDTUOJ.role.dto.RoleDTO;

import java.util.List;

public interface RoleService {
    Response<RoleDTO> createRole(RoleDTO roleDTO);
    Response<RoleDTO> updateRole(RoleDTO roleDTO);
    Response<List<RoleDTO>> getAllRoles();
    Response<?> deleteRole(Long id);
}
