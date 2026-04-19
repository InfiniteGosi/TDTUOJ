package com.oj.TDTUOJ.organization.service;

import com.oj.TDTUOJ.common.enums.OrganizationMemberRole;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.organization.dto.CreateOrganizationRequest;
import com.oj.TDTUOJ.organization.dto.OrganizationDTO;
import com.oj.TDTUOJ.organization.dto.OrganizationMemberDTO;
import com.oj.TDTUOJ.organization.entity.Organization;
import com.oj.TDTUOJ.organization.entity.OrganizationMember;
import com.oj.TDTUOJ.organization.repository.OrganizationMemberRepository;
import com.oj.TDTUOJ.organization.repository.OrganizationRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Random;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationServiceImpl implements OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final UserService userService;
    private final com.oj.TDTUOJ.user.repository.UserRepository userRepository;

    private static final String CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 6;
    private static final Random RANDOM = new Random();

    // ── Create ────────────────────────────────────────────────────────────── //

    @Override
    @Transactional
    public Response<OrganizationDTO> createOrganization(CreateOrganizationRequest request) {
        User creator = userService.getCurrentLoggedInUser();

        String slug = slugify(request.getName());
        if (organizationRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        String code;
        if (request.getCode() != null && !request.getCode().isBlank()) {
            code = request.getCode().toUpperCase().trim();
            if (organizationRepository.existsByCode(code)) {
                throw new BadRequestException("Code '" + code + "' is already in use");
            }
        } else {
            code = generateUniqueCode();
        }

        Organization org = Organization.builder()
                .name(request.getName())
                .about(request.getAbout())
                .slug(slug)
                .code(code)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : Boolean.TRUE)
                .creator(creator)
                .build();

        Organization saved = organizationRepository.save(org);

        // Creator automatically becomes OWNER
        OrganizationMember ownerMember = OrganizationMember.builder()
                .organization(saved)
                .user(creator)
                .role(OrganizationMemberRole.OWNER)
                .build();
        memberRepository.save(ownerMember);

        log.info("Created organization id={} slug={} by user={}", saved.getId(), saved.getSlug(), creator.getUsername());
        return Response.<OrganizationDTO>builder()
                .statusCode(HttpStatus.CREATED.value())
                .message("Organization created successfully")
                .data(toDTO(saved, creator))
                .build();
    }

    // ── Update ────────────────────────────────────────────────────────────── //

    @Override
    @Transactional
    public Response<OrganizationDTO> updateOrganization(Long id, CreateOrganizationRequest request) {
        Organization org = findOrgOrThrow(id);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgAdminOrOwner(org.getId(), currentUser);

        if (request.getName() != null) org.setName(request.getName());
        if (request.getAbout() != null) org.setAbout(request.getAbout());
        if (request.getIsPublic() != null) org.setIsPublic(request.getIsPublic());
        if (request.getCode() != null && !request.getCode().isBlank()) {
            String newCode = request.getCode().toUpperCase().trim();
            if (!newCode.equals(org.getCode()) && organizationRepository.existsByCode(newCode)) {
                throw new BadRequestException("Code '" + newCode + "' is already in use");
            }
            org.setCode(newCode);
        }

        Organization saved = organizationRepository.save(org);
        return ok(toDTO(saved, currentUser));
    }

    // ── Delete ────────────────────────────────────────────────────────────── //

    @Override
    @Transactional
    public Response<Void> deleteOrganization(Long id) {
        Organization org = findOrgOrThrow(id);
        User currentUser = userService.getCurrentLoggedInUser();

        // Only OWNER or platform ADMIN can delete
        if (!hasPlatformRole(currentUser, "ADMIN")) {
            assertOrgOwner(org.getId(), currentUser);
        }

        organizationRepository.delete(org);
        log.info("Deleted organization id={} by user={}", id, currentUser.getUsername());
        return Response.<Void>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Organization deleted successfully")
                .build();
    }

    // ── Read ──────────────────────────────────────────────────────────────── //

    @Override
    public Response<OrganizationDTO> getOrganizationBySlug(String slug) {
        Organization org = organizationRepository.findBySlug(slug)
                .orElseThrow(() -> new NotFoundException("Organization not found: " + slug));
        User currentUser = tryGetCurrentUser();
        return ok(toDTO(org, currentUser));
    }

    @Override
    public Response<Page<OrganizationDTO>> getOrganizations(int page, int size, String search) {
        if (size <= 0) size = 12;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        User currentUser = tryGetCurrentUser();

        Page<Organization> orgPage;
        if (search != null && !search.isBlank()) {
            orgPage = organizationRepository.findByNameContainingIgnoreCase(search.trim(), pageable);
        } else {
            orgPage = organizationRepository.findAll(pageable);
        }

        Page<OrganizationDTO> dtoPage = orgPage.map(o -> toDTO(o, currentUser));
        return ok(dtoPage);
    }

    @Override
    public Response<Page<OrganizationDTO>> getMyOrganizations(int page, int size) {
        if (size <= 0) size = 12;
        User currentUser = userService.getCurrentLoggedInUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "joinedAt"));

        Page<OrganizationMember> memberPage = memberRepository.findByUserId(currentUser.getId(), pageable);
        Page<OrganizationDTO> dtoPage = memberPage.map(m -> toDTO(m.getOrganization(), currentUser));
        return ok(dtoPage);
    }

    // ── Join / Leave ──────────────────────────────────────────────────────── //

    @Override
    @Transactional
    public Response<OrganizationDTO> joinOrganization(Long orgId, String code) {
        User currentUser = userService.getCurrentLoggedInUser();
        Organization org = findOrgOrThrow(orgId);

        if (memberRepository.existsByOrganizationIdAndUserId(org.getId(), currentUser.getId())) {
            throw new BadRequestException("You are already a member of this organization");
        }

        // Private orgs require the correct code
        if (!Boolean.TRUE.equals(org.getIsPublic())) {
            if (code == null || code.isBlank()) {
                throw new BadRequestException("This organization requires a code to join");
            }
            if (!org.getCode().equalsIgnoreCase(code.trim())) {
                throw new BadRequestException("Invalid code");
            }
        }

        OrganizationMember member = OrganizationMember.builder()
                .organization(org)
                .user(currentUser)
                .role(OrganizationMemberRole.MEMBER)
                .build();
        memberRepository.save(member);

        log.info("User {} joined organization {}", currentUser.getUsername(), org.getSlug());
        return Response.<OrganizationDTO>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Joined organization successfully")
                .data(toDTO(org, currentUser))
                .build();
    }

    @Override
    @Transactional
    public Response<Void> leaveOrganization(Long id) {
        Organization org = findOrgOrThrow(id);
        User currentUser = userService.getCurrentLoggedInUser();

        OrganizationMember membership = memberRepository.findByOrganizationIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new BadRequestException("You are not a member of this organization"));

        if (membership.getRole() == OrganizationMemberRole.OWNER) {
            throw new BadRequestException("Owner cannot leave the organization. Transfer ownership or delete the organization.");
        }

        memberRepository.delete(membership);
        log.info("User {} left organization {}", currentUser.getUsername(), org.getSlug());
        return Response.<Void>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Left organization successfully")
                .build();
    }

    // ── Members ───────────────────────────────────────────────────────────── //

    @Override
    public Response<Page<OrganizationMemberDTO>> getMembers(Long orgId, int page, int size, String search) {
        findOrgOrThrow(orgId);
        if (size <= 0) size = 20;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "joinedAt"));

        User currentUser = tryGetCurrentUser();
        boolean isMember = false;
        boolean isPlatformAdmin = false;

        if (currentUser != null) {
            isPlatformAdmin = hasPlatformRole(currentUser, "ADMIN");
            isMember = memberRepository.existsByOrganizationIdAndUserId(orgId, currentUser.getId());
        }

        Page<OrganizationMemberDTO> dtoPage;
        if (isMember || isPlatformAdmin) {
            // Members and platform admins see full member list
            if (search != null && !search.isBlank()) {
                dtoPage = memberRepository.findByOrganizationIdAndUserUsernameContainingIgnoreCase(
                        orgId, search.trim(), pageable
                ).map(this::toMemberDTO);
            } else {
                dtoPage = memberRepository.findByOrganizationId(orgId, pageable)
                        .map(this::toMemberDTO);
            }
        } else {
            // Non-members only see OWNER / ADMIN
            dtoPage = memberRepository.findByOrganizationIdAndRoleIn(
                    orgId,
                    List.of(OrganizationMemberRole.OWNER, OrganizationMemberRole.ADMIN),
                    pageable
            ).map(this::toMemberDTO);
        }

        return ok(dtoPage);
    }

    @Override
    public Response<Page<OrganizationMemberDTO>> searchNonMembers(Long orgId, String query, int page, int size) {
        findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgAdminOrOwner(orgId, currentUser);

        if (size <= 0) size = 10;
        if (query == null || query.isBlank()) query = "";
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "username"));

        Page<User> users = userRepository.findNonMembersByUsername(orgId, query.trim(), pageable);
        Page<OrganizationMemberDTO> dtoPage = users.map(u -> {
            OrganizationMemberDTO dto = new OrganizationMemberDTO();
            dto.setUserId(u.getId());
            dto.setUsername(u.getUsername());
            dto.setName(u.getName());
            dto.setProfileUrl(u.getProfileUrl());
            dto.setRole(null); // not a member yet
            return dto;
        });

        return ok(dtoPage);
    }

    @Override
    @Transactional
    public Response<OrganizationMemberDTO> addMember(Long orgId, Long userId) {
        Organization org = findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgAdminOrOwner(orgId, currentUser);

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));

        if (memberRepository.existsByOrganizationIdAndUserId(orgId, userId)) {
            throw new BadRequestException("User is already a member of this organization");
        }

        OrganizationMember member = OrganizationMember.builder()
                .organization(org)
                .user(targetUser)
                .role(OrganizationMemberRole.MEMBER)
                .build();
        OrganizationMember saved = memberRepository.save(member);

        log.info("User {} added to org {} by {}", targetUser.getUsername(), org.getSlug(), currentUser.getUsername());
        return Response.<OrganizationMemberDTO>builder()
                .statusCode(HttpStatus.CREATED.value())
                .message("Member added successfully")
                .data(toMemberDTO(saved))
                .build();
    }

    @Override
    @Transactional
    public Response<OrganizationMemberDTO> updateMemberRole(Long orgId, Long userId, String role) {
        findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();

        // Only OWNER can change roles
        assertOrgOwner(orgId, currentUser);

        OrganizationMember target = memberRepository.findByOrganizationIdAndUserId(orgId, userId)
                .orElseThrow(() -> new NotFoundException("Member not found in this organization"));

        if (target.getRole() == OrganizationMemberRole.OWNER) {
            throw new BadRequestException("Cannot change the owner's role");
        }

        OrganizationMemberRole newRole;
        try {
            newRole = OrganizationMemberRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + role + ". Valid roles: ADMIN, MEMBER");
        }

        if (newRole == OrganizationMemberRole.OWNER) {
            throw new BadRequestException("Cannot assign OWNER role. Use ownership transfer instead.");
        }

        target.setRole(newRole);
        OrganizationMember saved = memberRepository.save(target);
        log.info("Updated role of user {} in org {} to {}", userId, orgId, newRole);
        return ok(toMemberDTO(saved));
    }

    @Override
    @Transactional
    public Response<Void> removeMember(Long orgId, Long userId) {
        findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgAdminOrOwner(orgId, currentUser);

        OrganizationMember target = memberRepository.findByOrganizationIdAndUserId(orgId, userId)
                .orElseThrow(() -> new NotFoundException("Member not found in this organization"));

        if (target.getRole() == OrganizationMemberRole.OWNER) {
            throw new BadRequestException("Cannot remove the organization owner");
        }

        // An ADMIN cannot remove another ADMIN — only OWNER can
        OrganizationMember actorMembership = memberRepository.findByOrganizationIdAndUserId(orgId, currentUser.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("You are not a member of this organization"));
        if (actorMembership.getRole() == OrganizationMemberRole.ADMIN
                && target.getRole() == OrganizationMemberRole.ADMIN) {
            throw new UnauthorizedAccessException("An admin cannot remove another admin");
        }

        memberRepository.delete(target);
        log.info("Removed user {} from org {} by {}", userId, orgId, currentUser.getUsername());
        return Response.<Void>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Member removed successfully")
                .build();
    }

    // ── Internal helpers ──────────────────────────────────────────────────── //

    private Organization findOrgOrThrow(Long id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Organization not found: " + id));
    }

    private OrganizationDTO toDTO(Organization org, User currentUser) {
        OrganizationDTO dto = new OrganizationDTO();
        dto.setId(org.getId());
        dto.setName(org.getName());
        dto.setAbout(org.getAbout());
        dto.setSlug(org.getSlug());
        dto.setIsPublic(org.getIsPublic());
        dto.setCreatorId(org.getCreator() != null ? org.getCreator().getId() : null);
        dto.setCreatorUsername(org.getCreator() != null ? org.getCreator().getUsername() : null);
        dto.setTotalMembers((int) memberRepository.countByOrganizationId(org.getId()));
        dto.setCreatedAt(org.getCreatedAt());
        dto.setUpdatedAt(org.getUpdatedAt());

        // Set caller's role & conditionally include code
        if (currentUser != null) {
            Optional<OrganizationMember> membership =
                    memberRepository.findByOrganizationIdAndUserId(org.getId(), currentUser.getId());
            if (membership.isPresent()) {
                OrganizationMemberRole myRole = membership.get().getRole();
                dto.setMyRole(myRole.name());
                // Only OWNER / ADMIN can see the join code
                if (myRole == OrganizationMemberRole.OWNER || myRole == OrganizationMemberRole.ADMIN) {
                    dto.setCode(org.getCode());
                }
            }
            // Platform ADMIN can also see the code
            if (hasPlatformRole(currentUser, "ADMIN")) {
                dto.setCode(org.getCode());
            }
        }

        return dto;
    }

    private OrganizationMemberDTO toMemberDTO(OrganizationMember member) {
        OrganizationMemberDTO dto = new OrganizationMemberDTO();
        dto.setId(member.getId());
        dto.setUserId(member.getUser().getId());
        dto.setUsername(member.getUser().getUsername());
        dto.setName(member.getUser().getName());
        dto.setProfileUrl(member.getUser().getProfileUrl());
        dto.setRole(member.getRole().name());
        dto.setJoinedAt(member.getJoinedAt());
        return dto;
    }

    private void assertOrgOwner(Long orgId, User user) {
        OrganizationMember membership = memberRepository.findByOrganizationIdAndUserId(orgId, user.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("You are not a member of this organization"));
        if (membership.getRole() != OrganizationMemberRole.OWNER) {
            throw new UnauthorizedAccessException("Only the organization owner can perform this action");
        }
    }

    private void assertOrgAdminOrOwner(Long orgId, User user) {
        // Platform ADMINs bypass org-level checks
        if (hasPlatformRole(user, "ADMIN")) return;

        OrganizationMember membership = memberRepository.findByOrganizationIdAndUserId(orgId, user.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("You are not a member of this organization"));
        if (membership.getRole() != OrganizationMemberRole.OWNER
                && membership.getRole() != OrganizationMemberRole.ADMIN) {
            throw new UnauthorizedAccessException("Only organization owner or admin can perform this action");
        }
    }

    private boolean hasPlatformRole(User user, String roleName) {
        return user.getRoles().stream()
                .anyMatch(r -> roleName.equals(r.getName()));
    }

    /**
     * Attempts to get the currently authenticated user, returns null if anonymous.
     */
    private User tryGetCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()
                    && !(auth.getPrincipal() instanceof String && "anonymousUser".equals(auth.getPrincipal()))) {
                return userService.getCurrentLoggedInUser();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            code = sb.toString();
        } while (organizationRepository.existsByCode(code));
        return code;
    }

    private static String slugify(String input) {
        if (input == null) return "organization";
        String normalised = Normalizer.normalize(input, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalised).replaceAll("")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }

    private <T> Response<T> ok(T data) {
        return Response.<T>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
    }
}
