package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.response.Response;
import com.oj.TDTUOJ.user.dto.UserDTO;
import com.oj.TDTUOJ.user.entity.User;
import org.springframework.data.domain.Page;

import java.util.List;

public interface UserService {
    User getCurrentLoggedInUser();

    Response<UserDTO> getOwnAccountDetails();

    Response<?> updateOwnAccount(UserDTO userDTO);

    Response<?> deactivateOwnAccount();

    // For admins
    Response<?> updateUserAsAdmin(Long userId, UserDTO userDTO);

    Response<UserDTO> getUserById(Long userId);

    Response<Page<UserDTO>> getAllUsers(Integer limit,
                                        Integer offset,
                                        String sortField,
                                        String direction,
                                        String title);
}
