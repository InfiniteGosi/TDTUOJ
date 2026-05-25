package com.oj.TDTUOJ.organization.service;

import com.oj.TDTUOJ.common.enums.OrganizationMemberRole;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.organization.dto.OrganizationDTO;
import com.oj.TDTUOJ.organization.dto.OrganizationMemberDTO;
import com.oj.TDTUOJ.organization.entity.Organization;
import com.oj.TDTUOJ.organization.entity.OrganizationMember;
import com.oj.TDTUOJ.organization.repository.OrganizationMemberRepository;
import com.oj.TDTUOJ.organization.repository.OrganizationRepository;
import com.oj.TDTUOJ.role.entity.Role;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.repository.UserRepository;
import com.oj.TDTUOJ.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizationServiceImplTest {
    @Mock private OrganizationRepository organizationRepository;
    @Mock private OrganizationMemberRepository memberRepository;
    @Mock private UserService userService;
    @Mock private UserRepository userRepository;

    @InjectMocks private OrganizationServiceImpl service;

    private User user(Long id, String... roleNames) {
        User u = new User();
        u.setId(id);
        u.setUsername("u" + id);
        Set<Role> roles = new HashSet<>();
        for (String r : roleNames) {
            Role role = new Role();
            role.setName(r);
            roles.add(role);
        }
        u.setRoles(roles);
        return u;
    }

    private Organization org(Long id, boolean isPublic, String code) {
        Organization o = new Organization();
        o.setId(id);
        o.setName("Org");
        o.setSlug("org");
        o.setIsPublic(isPublic);
        o.setCode(code);
        o.setMembers(new java.util.ArrayList<>());
        return o;
    }

    private OrganizationMember member(User u, OrganizationMemberRole role) {
        OrganizationMember m = OrganizationMember.builder()
                .user(u).role(role).build();
        m.setId(1L);
        return m;
    }

    @Test
    void joinOrganization_PublicOrg_Success() {
        User u = user(5L, "PARTICIPANT");
        Organization o = org(1L, true, "PUBCODE");
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.existsByOrganizationIdAndUserId(1L, 5L)).thenReturn(false);

        Response<OrganizationDTO> resp = service.joinOrganization(1L, null);

        assertEquals(HttpStatus.OK.value(), resp.getStatusCode());
        verify(memberRepository).save(any());
    }

    @Test
    void joinOrganization_AlreadyMember_Throws() {
        User u = user(5L, "PARTICIPANT");
        Organization o = org(1L, true, "X");
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.existsByOrganizationIdAndUserId(1L, 5L)).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.joinOrganization(1L, null));
        assertTrue(ex.getMessage().contains("already a member"));
        verify(memberRepository, never()).save(any());
    }

    @Test
    void joinOrganization_PrivateWithoutCode_Throws() {
        User u = user(5L, "PARTICIPANT");
        Organization o = org(1L, false, "SECRET");
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.existsByOrganizationIdAndUserId(1L, 5L)).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.joinOrganization(1L, null));
        assertTrue(ex.getMessage().contains("requires a code"));
    }

    @Test
    void joinOrganization_PrivateInvalidCode_Throws() {
        User u = user(5L, "PARTICIPANT");
        Organization o = org(1L, false, "SECRET");
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.existsByOrganizationIdAndUserId(1L, 5L)).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.joinOrganization(1L, "wrong"));
        assertEquals("Invalid code", ex.getMessage());
    }

    @Test
    void leaveOrganization_OwnerCannotLeave_Throws() {
        User u = user(5L, "PARTICIPANT");
        Organization o = org(1L, true, "X");
        when(userService.getCurrentLoggedInUser()).thenReturn(u);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.findByOrganizationIdAndUserId(1L, 5L))
                .thenReturn(Optional.of(member(u, OrganizationMemberRole.OWNER)));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.leaveOrganization(1L));
        assertTrue(ex.getMessage().contains("Owner cannot leave"));
    }

    @Test
    void addMember_ByAdminMembership_Success() {
        User actor = user(5L, "PARTICIPANT");
        User target = user(10L, "PARTICIPANT");
        Organization o = org(1L, true, "X");
        when(userService.getCurrentLoggedInUser()).thenReturn(actor);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.findByOrganizationIdAndUserId(1L, 5L))
                .thenReturn(Optional.of(member(actor, OrganizationMemberRole.ADMIN)));
        when(userRepository.findById(10L)).thenReturn(Optional.of(target));
        when(memberRepository.existsByOrganizationIdAndUserId(1L, 10L)).thenReturn(false);
        when(memberRepository.save(any())).thenAnswer(inv -> {
            OrganizationMember m = inv.getArgument(0);
            m.setId(99L);
            return m;
        });

        Response<OrganizationMemberDTO> resp = service.addMember(1L, 10L);

        assertEquals(HttpStatus.CREATED.value(), resp.getStatusCode());
        assertEquals("MEMBER", resp.getData().getRole());
    }

    @Test
    void addMember_ByNonMember_ThrowsUnauthorized() {
        User actor = user(5L, "PARTICIPANT");
        Organization o = org(1L, true, "X");
        when(userService.getCurrentLoggedInUser()).thenReturn(actor);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.findByOrganizationIdAndUserId(1L, 5L)).thenReturn(Optional.empty());

        assertThrows(UnauthorizedAccessException.class,
                () -> service.addMember(1L, 10L));
        verify(memberRepository, never()).save(any());
    }

    @Test
    void removeMember_TargetIsOwner_Throws() {
        User actor = user(5L, "PARTICIPANT");
        User target = user(10L, "PARTICIPANT");
        Organization o = org(1L, true, "X");
        when(userService.getCurrentLoggedInUser()).thenReturn(actor);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.findByOrganizationIdAndUserId(1L, 5L))
                .thenReturn(Optional.of(member(actor, OrganizationMemberRole.ADMIN)));
        when(memberRepository.findByOrganizationIdAndUserId(1L, 10L))
                .thenReturn(Optional.of(member(target, OrganizationMemberRole.OWNER)));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> service.removeMember(1L, 10L));
        assertTrue(ex.getMessage().contains("Cannot remove the organization owner"));
    }

    @Test
    void removeMember_AdminCannotRemoveAdmin() {
        User actor = user(5L, "PARTICIPANT");
        User target = user(10L, "PARTICIPANT");
        Organization o = org(1L, true, "X");
        when(userService.getCurrentLoggedInUser()).thenReturn(actor);
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(memberRepository.findByOrganizationIdAndUserId(1L, 10L))
                .thenReturn(Optional.of(member(target, OrganizationMemberRole.ADMIN)));
        when(memberRepository.findByOrganizationIdAndUserId(1L, 5L))
                .thenReturn(Optional.of(member(actor, OrganizationMemberRole.ADMIN)));

        UnauthorizedAccessException ex = assertThrows(UnauthorizedAccessException.class,
                () -> service.removeMember(1L, 10L));
        assertTrue(ex.getMessage().contains("admin cannot remove another admin"));
    }

    @Test
    void deleteOrganization_OwnerOnly_BlocksNonOwner() {
        User actor = user(5L, "PARTICIPANT");
        Organization o = org(1L, true, "X");
        when(organizationRepository.findById(1L)).thenReturn(Optional.of(o));
        when(userService.getCurrentLoggedInUser()).thenReturn(actor);
        when(memberRepository.findByOrganizationIdAndUserId(1L, 5L))
                .thenReturn(Optional.of(member(actor, OrganizationMemberRole.MEMBER)));

        assertThrows(UnauthorizedAccessException.class,
                () -> service.deleteOrganization(1L));
        verify(organizationRepository, never()).delete(any());
    }

    @Test
    void getOrganizationBySlug_NotFound_Throws() {
        when(organizationRepository.findBySlug("missing")).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.getOrganizationBySlug("missing"));
    }
}
