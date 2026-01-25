package com.oj.TDTUOJ.role.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.role.dto.RoleDTO;
import com.oj.TDTUOJ.role.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/roles")
@PreAuthorize("hasAuthority('ADMIN')")
public class RoleController {
    private final RoleService roleService;

    @PostMapping
    public ResponseEntity<Response<RoleDTO>> createRole(@RequestBody @Valid RoleDTO roleDTo) {
        return ResponseEntity.ok(roleService.createRole(roleDTo));
    }

    @PutMapping
    public ResponseEntity<Response<RoleDTO>> updateRole(@RequestBody @Valid RoleDTO roleDTo) {
        return ResponseEntity.ok(roleService.updateRole(roleDTo));
    }

    @GetMapping
    public ResponseEntity<Response<List<RoleDTO>>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Response<?>> deleteRole(@PathVariable Long id) {
        return ResponseEntity.ok(roleService.deleteRole(id));
    }
}
