package com.oj.TDTUOJ.organization.controller;

import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.organization.dto.CreateOrganizationRequest;
import com.oj.TDTUOJ.organization.dto.OrganizationDTO;
import com.oj.TDTUOJ.organization.dto.OrganizationMemberDTO;
import com.oj.TDTUOJ.organization.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/organizations")
public class OrganizationController {

    private final OrganizationService organizationService;

    // ── Public read endpoints ─────────────────────────────────────────────── //

    @GetMapping
    public ResponseEntity<Response<Page<OrganizationDTO>>> getOrganizations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "") String search
    ) {
        return ResponseEntity.ok(organizationService.getOrganizations(page, size, search));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<Response<OrganizationDTO>> getOrganizationBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(organizationService.getOrganizationBySlug(slug));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<Response<Page<OrganizationMemberDTO>>> getMembers(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search
    ) {
        return ResponseEntity.ok(organizationService.getMembers(id, page, size, search));
    }

    // ── Authenticated endpoints ───────────────────────────────────────────── //

    @GetMapping("/my")
    public ResponseEntity<Response<Page<OrganizationDTO>>> getMyOrganizations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(organizationService.getMyOrganizations(page, size));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN') or hasAuthority('CREATOR')")
    public ResponseEntity<Response<OrganizationDTO>> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request
    ) {
        Response<OrganizationDTO> response = organizationService.createOrganization(request);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Response<OrganizationDTO>> updateOrganization(
            @PathVariable Long id,
            @Valid @RequestBody CreateOrganizationRequest request
    ) {
        return ResponseEntity.ok(organizationService.updateOrganization(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Response<Void>> deleteOrganization(@PathVariable Long id) {
        return ResponseEntity.ok(organizationService.deleteOrganization(id));
    }

    // ── Join / Leave ──────────────────────────────────────────────────────── //

    @PostMapping("/{id}/join")
    public ResponseEntity<Response<OrganizationDTO>> joinOrganization(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String code = (body != null) ? body.get("code") : null;
        Response<OrganizationDTO> response = organizationService.joinOrganization(id, code);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Response<Void>> leaveOrganization(@PathVariable Long id) {
        return ResponseEntity.ok(organizationService.leaveOrganization(id));
    }

    // ── Member management ─────────────────────────────────────────────────── //

    /** Search platform users NOT yet in this org (for "Add Member" UI). */
    @GetMapping("/{id}/search-users")
    public ResponseEntity<Response<Page<OrganizationMemberDTO>>> searchNonMembers(
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(organizationService.searchNonMembers(id, q, page, size));
    }

    /** Manually add a user to this org as MEMBER. */
    @PostMapping("/{id}/members")
    public ResponseEntity<Response<OrganizationMemberDTO>> addMember(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body
    ) {
        Long userId = body.get("userId");
        Response<OrganizationMemberDTO> response = organizationService.addMember(id, userId);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }

    @PutMapping("/{id}/members/{userId}/role")
    public ResponseEntity<Response<OrganizationMemberDTO>> updateMemberRole(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestBody Map<String, String> body
    ) {
        String role = body.get("role");
        return ResponseEntity.ok(organizationService.updateMemberRole(id, userId, role));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Response<Void>> removeMember(
            @PathVariable Long id,
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(organizationService.removeMember(id, userId));
    }
}
