package com.oj.TDTUOJ.user.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.user.dto.UserDTO;
import com.oj.TDTUOJ.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/admin/users")
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminUserController {
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Response<Page<UserDTO>>> getAllUsers(
            @RequestParam(defaultValue = "20") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset,
            @RequestParam(defaultValue = "id") String sortField,
            @RequestParam(defaultValue = "asc") String direction,
            @RequestParam(required = false) String name) {


        return ResponseEntity.ok(userService.getAllUsers(limit, offset, sortField, direction, name));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Response<UserDTO>> getUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @PutMapping(value = "/{userId}")
    public ResponseEntity<Response<?>> updateUser(
            @PathVariable Long userId,
            @RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(userService.updateUserAsAdmin(userId, userDTO));
    }
}
