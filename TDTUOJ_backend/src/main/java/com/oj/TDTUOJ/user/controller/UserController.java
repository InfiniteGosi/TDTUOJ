package com.oj.TDTUOJ.user.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.user.dto.UserDTO;
import com.oj.TDTUOJ.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/users")
public class UserController {
    private final UserService userService;

    @GetMapping("/account")
    public ResponseEntity<Response<UserDTO>> getAccountDetails() {
        return ResponseEntity.ok(userService.getOwnAccountDetails());
    }
}
