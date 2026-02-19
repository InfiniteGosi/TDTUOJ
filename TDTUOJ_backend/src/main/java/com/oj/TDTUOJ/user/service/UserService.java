package com.oj.TDTUOJ.user.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.user.dto.ChangePasswordRequest;
import com.oj.TDTUOJ.user.dto.UserDTO;
import com.oj.TDTUOJ.user.entity.User;
import org.springframework.data.domain.Page;

public interface UserService {
    User getCurrentLoggedInUser();

    Response<UserDTO> getOwnAccountDetails();

    Response<?> updateOwnAccount(UserDTO userDTO);

    Response<?> changePassword(ChangePasswordRequest request);

    Response<?> deactivateOwnAccount();

    // For admins
    Response<?> updateUserAsAdmin(UserDTO userDTO);

    Response<UserDTO> getUserById(Long userId);

    Response<UserDTO> getUserByUsername(String username);

    Response<Page<UserDTO>> getAllUsers(Integer limit,
                                        Integer offset,
                                        String sortField,
                                        String direction,
                                        String username);
}
