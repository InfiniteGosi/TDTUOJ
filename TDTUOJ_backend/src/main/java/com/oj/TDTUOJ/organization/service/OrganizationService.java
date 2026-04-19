package com.oj.TDTUOJ.organization.service;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.organization.dto.CreateOrganizationRequest;
import com.oj.TDTUOJ.organization.dto.OrganizationDTO;
import com.oj.TDTUOJ.organization.dto.OrganizationMemberDTO;
import org.springframework.data.domain.Page;

public interface OrganizationService {

    Response<OrganizationDTO> createOrganization(CreateOrganizationRequest request);

    Response<OrganizationDTO> updateOrganization(Long id, CreateOrganizationRequest request);

    Response<Void> deleteOrganization(Long id);

    Response<OrganizationDTO> getOrganizationBySlug(String slug);

    Response<Page<OrganizationDTO>> getOrganizations(int page, int size, String search);

    Response<Page<OrganizationDTO>> getMyOrganizations(int page, int size);

    /** Join an organization. Public orgs require no code; private orgs require the correct code. */
    Response<OrganizationDTO> joinOrganization(Long orgId, String code);

    Response<Void> leaveOrganization(Long id);

    Response<Page<OrganizationMemberDTO>> getMembers(Long orgId, int page, int size, String search);

    /** Search platform users who are NOT yet members of this org. */
    Response<Page<OrganizationMemberDTO>> searchNonMembers(Long orgId, String query, int page, int size);

    /** OWNER / org ADMIN: manually add a user as MEMBER. */
    Response<OrganizationMemberDTO> addMember(Long orgId, Long userId);

    /** OWNER only: change a member's role. */
    Response<OrganizationMemberDTO> updateMemberRole(Long orgId, Long userId, String role);

    /** OWNER / org ADMIN: remove a member. */
    Response<Void> removeMember(Long orgId, Long userId);
}
