package com.oj.TDTUOJ.lab.service;

import com.oj.TDTUOJ.common.enums.OrganizationMemberRole;
import com.oj.TDTUOJ.common.enums.SubmissionVerdict;
import com.oj.TDTUOJ.common.exceptions.BadRequestException;
import com.oj.TDTUOJ.common.exceptions.NotFoundException;
import com.oj.TDTUOJ.common.exceptions.UnauthorizedAccessException;
import com.oj.TDTUOJ.common.response.Response;
import com.oj.TDTUOJ.lab.dto.*;
import com.oj.TDTUOJ.lab.entity.Lab;
import com.oj.TDTUOJ.lab.entity.LabExercise;
import com.oj.TDTUOJ.lab.repository.LabExerciseRepository;
import com.oj.TDTUOJ.lab.repository.LabRepository;
import com.oj.TDTUOJ.organization.entity.Organization;
import com.oj.TDTUOJ.organization.entity.OrganizationMember;
import com.oj.TDTUOJ.organization.repository.OrganizationMemberRepository;
import com.oj.TDTUOJ.organization.repository.OrganizationRepository;
import com.oj.TDTUOJ.problem.entity.Problem;
import com.oj.TDTUOJ.problem.repository.ProblemRepository;
import com.oj.TDTUOJ.submission.repository.SubmissionRepository;
import com.oj.TDTUOJ.user.entity.User;
import com.oj.TDTUOJ.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Lab business logic. Two authorization tiers are used throughout:
 * <ul>
 *   <li><b>member</b> ({@link #assertOrgMember}) — anyone in the org may read labs;</li>
 *   <li><b>owner</b> ({@link #assertOrgOwner}) — only the org OWNER may create,
 *       edit, delete, view progress, export, or publish solutions.</li>
 * </ul>
 * A platform ADMIN bypasses both. Note the deliberately stricter owner-only gate
 * on mutations: unlike most org actions, org ADMINs cannot manage labs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LabServiceImpl implements LabService {

    private final LabRepository labRepository;
    private final LabExerciseRepository exerciseRepository;
    private final OrganizationRepository orgRepository;
    private final OrganizationMemberRepository memberRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final UserService userService;

    // ── List labs ──────────────────────────────────────────────────────────── //

    @Override
    public Response<Page<LabDTO>> getLabsByOrg(Long orgId, int page, int size) {
        findOrgOrThrow(orgId);
        assertOrgMember(orgId); // reading the lab list requires org membership

        if (size <= 0) size = 10;
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        User currentUser = tryGetCurrentUser();
        Page<LabDTO> dtoPage = labRepository.findByOrganizationId(orgId, pageable)
                .map(lab -> toLabDTO(lab, currentUser, false));

        return ok(dtoPage);
    }

    // ── Lab detail ────────────────────────────────────────────────────────── //

    @Override
    public Response<LabDTO> getLabDetail(Long orgId, String slug) {
        findOrgOrThrow(orgId);
        assertOrgMember(orgId);

        Lab lab = labRepository.findByOrganizationIdAndSlug(orgId, slug)
                .orElseThrow(() -> new NotFoundException("Lab not found: " + slug));

        User currentUser = tryGetCurrentUser();
        LabDTO dto = toLabDTO(lab, currentUser, true);
        return ok(dto);
    }

    // ── Create lab ────────────────────────────────────────────────────────── //

    /** Owner-only. Generates a unique slug, persists the lab, then attaches each requested problem as an exercise. */
    @Override
    @Transactional
    public Response<LabDTO> createLab(Long orgId, CreateLabRequest request) {
        Organization org = findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgOwner(orgId, currentUser);

        String slug = generateSlug(request.getTitle());
        // Append -1, -2, ... until the slug is unique within this org (slugs are only per-org unique).
        int suffix = 1;
        String baseSlug = slug;
        while (labRepository.existsByOrganizationIdAndSlug(orgId, slug)) {
            slug = baseSlug + "-" + suffix++;
        }

        Lab lab = Lab.builder()
                .organization(org)
                .creator(currentUser)
                .title(request.getTitle())
                .slug(slug)
                .description(request.getDescription())
                .deadline(request.getDeadline())
                .build();

        lab = labRepository.save(lab);

        // Add exercises
        if (request.getExercises() != null) {
            int order = 1;
            for (CreateLabRequest.ExerciseEntry entry : request.getExercises()) {
                Problem problem = problemRepository.findById(entry.getProblemId())
                        .orElseThrow(() -> new NotFoundException("Problem not found: " + entry.getProblemId()));
                validateProblemEligibleForLab(problem, currentUser);

                // Fall back to the problem's default point value when the request omits points.
                LabExercise exercise = LabExercise.builder()
                        .lab(lab)
                        .problem(problem)
                        .exerciseOrder(order++)
                        .points(entry.getPoints() != null ? entry.getPoints() : problem.getPoint())
                        .build();
                exerciseRepository.save(exercise);
            }
        }

        Lab saved = labRepository.findById(lab.getId()).orElseThrow();
        log.info("Lab '{}' created in org {} by {}", saved.getTitle(), orgId, currentUser.getUsername());

        return Response.<LabDTO>builder()
                .statusCode(HttpStatus.CREATED.value())
                .message("Lab created successfully")
                .data(toLabDTO(saved, currentUser, true))
                .build();
    }

    // ── Update lab ────────────────────────────────────────────────────────── //

    /** Owner-only. Updates metadata and fully rebuilds the exercise list from the request. */
    @Override
    @Transactional
    public Response<LabDTO> updateLab(Long orgId, Long labId, CreateLabRequest request) {
        findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgOwner(orgId, currentUser);

        Lab lab = labRepository.findById(labId)
                .orElseThrow(() -> new NotFoundException("Lab not found: " + labId));

        // Guard against a labId from a different org being manipulated via this org's URL.
        if (!lab.getOrganization().getId().equals(orgId)) {
            throw new BadRequestException("Lab does not belong to this organization");
        }

        lab.setTitle(request.getTitle());
        lab.setDescription(request.getDescription());
        lab.setDeadline(request.getDeadline());

        // Re-sync exercises: wipe the existing list and rebuild from the request payload.
        if (request.getExercises() != null) {
            // Problems already attached are exempt from eligibility checks
            // (e.g. one later published manually must not break lab edits).
            java.util.Set<Long> alreadyAttached = lab.getExercises().stream()
                    .map(ex -> ex.getProblem().getId())
                    .collect(Collectors.toSet());
            // orphanRemoval deletes the cleared LabExercise rows; flush forces the
            // DELETEs to hit the DB before the re-inserts below to avoid constraint clashes.
            lab.getExercises().clear();
            labRepository.flush();

            int order = 1;
            for (CreateLabRequest.ExerciseEntry entry : request.getExercises()) {
                Problem problem = problemRepository.findById(entry.getProblemId())
                        .orElseThrow(() -> new NotFoundException("Problem not found: " + entry.getProblemId()));
                if (!alreadyAttached.contains(problem.getId())) {
                    validateProblemEligibleForLab(problem, currentUser);
                }

                LabExercise exercise = LabExercise.builder()
                        .lab(lab)
                        .problem(problem)
                        .exerciseOrder(order++)
                        .points(entry.getPoints() != null ? entry.getPoints() : problem.getPoint())
                        .build();
                lab.getExercises().add(exercise);
            }
        }

        Lab saved = labRepository.save(lab);
        log.info("Lab '{}' updated in org {} by {}", saved.getTitle(), orgId, currentUser.getUsername());
        return ok(toLabDTO(saved, currentUser, true));
    }

    // ── Delete lab ────────────────────────────────────────────────────────── //

    @Override
    @Transactional
    public Response<Void> deleteLab(Long orgId, Long labId) {
        findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgOwner(orgId, currentUser);

        Lab lab = labRepository.findById(labId)
                .orElseThrow(() -> new NotFoundException("Lab not found: " + labId));

        // Reject cross-org tampering: the lab must belong to the org in the path.
        if (!lab.getOrganization().getId().equals(orgId)) {
            throw new BadRequestException("Lab does not belong to this organization");
        }

        labRepository.delete(lab);
        log.info("Lab {} deleted from org {} by {}", labId, orgId, currentUser.getUsername());

        return Response.<Void>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Lab deleted successfully")
                .build();
    }

    // ── Progress tracking ─────────────────────────────────────────────────── //

    /**
     * Builds the owner-facing progress grid: one row per student (org ADMIN/MEMBER),
     * one status cell per exercise. Owner-only.
     */
    @Override
    public Response<List<LabProgressDTO>> getLabProgress(Long orgId, Long labId) {
        findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgOwner(orgId, currentUser);

        Lab lab = labRepository.findById(labId)
                .orElseThrow(() -> new NotFoundException("Lab not found: " + labId));

        List<LabExercise> exercises = exerciseRepository.findByLabIdOrderByExerciseOrderAsc(labId);

        // Treat everyone except the OWNER as a "student" to track (org ADMINs are graded too).
        // Large page size (10000) is used as a cheap "fetch all members" since there's no unpaged variant.
        List<OrganizationMember> students = memberRepository.findByOrganizationId(orgId,
                        PageRequest.of(0, 10000, Sort.by("joinedAt")))
                .getContent()
                .stream()
                .filter(m -> m.getRole() != OrganizationMemberRole.OWNER)
                .collect(Collectors.toList());

        List<LabProgressDTO> progressList = new ArrayList<>();

        for (OrganizationMember student : students) {
            User user = student.getUser();
            List<LabProgressDTO.ExerciseStatus> statuses = new ArrayList<>();
            int solved = 0;
            int earned = 0;
            int total = 0;

            for (LabExercise ex : exercises) {
                total += (ex.getPoints() != null ? ex.getPoints() : 0);

                // Submissions are matched on (user, problem, THIS lab) so attempts made
                // outside the lab context don't count toward lab progress.
                boolean hasAC = submissionRepository.existsByUserIdAndProblemIdAndLabIdAndSubmissionVerdict(
                        user.getId(), ex.getProblem().getId(), labId, SubmissionVerdict.AC);

                long subCount = submissionRepository.countByUserIdAndProblemIdAndLabId(
                        user.getId(), ex.getProblem().getId(), labId);

                String status;
                String bestVerdict = null;

                // Three-state model: any AC => SOLVED (points earned); else any submission => ATTEMPTED; else NOT_STARTED.
                if (hasAC) {
                    status = "SOLVED";
                    bestVerdict = "AC";
                    solved++;
                    earned += (ex.getPoints() != null ? ex.getPoints() : 0);
                } else if (subCount > 0) {
                    status = "ATTEMPTED";
                    bestVerdict = "WA"; // simplified — actual best non-AC verdict isn't computed
                } else {
                    status = "NOT_STARTED";
                }

                statuses.add(LabProgressDTO.ExerciseStatus.builder()
                        .exerciseId(ex.getId())
                        .status(status)
                        .submissionCount((int) subCount)
                        .bestVerdict(bestVerdict)
                        .build());
            }

            progressList.add(LabProgressDTO.builder()
                    .userId(user.getId())
                    .username(user.getUsername())
                    .name(user.getName())
                    .exerciseStatuses(statuses)
                    .solvedCount(solved)
                    .totalPoints(total)
                    .earnedPoints(earned)
                    .build());
        }

        return ok(progressList);
    }

    // ── Export ─────────────────────────────────────────────────────────────── //

    /** Reuses {@link #getLabProgress} (which re-runs the owner check) then serializes to the requested format. */
    @Override
    public byte[] exportLabProgress(Long orgId, Long labId, String format) {
        Response<List<LabProgressDTO>> resp = getLabProgress(orgId, labId);
        List<LabProgressDTO> progressList = resp.getData();
        List<LabExercise> exercises = exerciseRepository.findByLabIdOrderByExerciseOrderAsc(labId);
        Lab lab = labRepository.findById(labId).orElseThrow();

        if ("xls".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) {
            return exportXlsx(lab, exercises, progressList);
        } else {
            return exportCsv(lab, exercises, progressList);
        }
    }

    private byte[] exportCsv(Lab lab, List<LabExercise> exercises, List<LabProgressDTO> progressList) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintWriter pw = new PrintWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8));

        // Header: fixed columns + one column per exercise, labelled A, B, C... by 1-based order.
        StringBuilder header = new StringBuilder("Name,Username");
        for (LabExercise ex : exercises) {
            String label = String.valueOf((char) ('A' + ex.getExerciseOrder() - 1));
            header.append(",").append(label).append(" - ").append(ex.getProblem().getTitle());
        }
        header.append(",Solved,Earned Points,Total Points");
        pw.println(header);

        // Data rows
        for (LabProgressDTO student : progressList) {
            StringBuilder row = new StringBuilder();
            row.append(escapeCsv(student.getName())).append(",")
               .append(escapeCsv(student.getUsername()));

            for (LabProgressDTO.ExerciseStatus es : student.getExerciseStatuses()) {
                row.append(",").append(es.getStatus());
            }

            row.append(",").append(student.getSolvedCount())
               .append(",").append(student.getEarnedPoints())
               .append(",").append(student.getTotalPoints());
            pw.println(row);
        }

        pw.flush();
        return baos.toByteArray();
    }

    private byte[] exportXlsx(Lab lab, List<LabExercise> exercises, List<LabProgressDTO> progressList) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(lab.getTitle());

            // Colour-coded cell styles: green=SOLVED, yellow=ATTEMPTED, red=NOT_STARTED.
            CellStyle greenStyle = workbook.createCellStyle();
            greenStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            greenStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle yellowStyle = workbook.createCellStyle();
            yellowStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
            yellowStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle redStyle = workbook.createCellStyle();
            redStyle.setFillForegroundColor(IndexedColors.ROSE.getIndex());
            redStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Header row
            Row headerRow = sheet.createRow(0);
            int col = 0;
            createCell(headerRow, col++, "Name", headerStyle);
            createCell(headerRow, col++, "Username", headerStyle);

            for (LabExercise ex : exercises) {
                String label = String.valueOf((char) ('A' + ex.getExerciseOrder() - 1))
                        + " - " + ex.getProblem().getTitle();
                createCell(headerRow, col++, label, headerStyle);
            }
            createCell(headerRow, col++, "Solved", headerStyle);
            createCell(headerRow, col++, "Earned", headerStyle);
            createCell(headerRow, col, "Total", headerStyle);

            // Data rows
            int rowIdx = 1;
            for (LabProgressDTO student : progressList) {
                Row row = sheet.createRow(rowIdx++);
                col = 0;
                row.createCell(col++).setCellValue(student.getName() != null ? student.getName() : "");
                row.createCell(col++).setCellValue(student.getUsername());

                for (LabProgressDTO.ExerciseStatus es : student.getExerciseStatuses()) {
                    Cell cell = row.createCell(col++);
                    cell.setCellValue(es.getStatus());

                    switch (es.getStatus()) {
                        case "SOLVED" -> cell.setCellStyle(greenStyle);
                        case "ATTEMPTED" -> cell.setCellStyle(yellowStyle);
                        case "NOT_STARTED" -> cell.setCellStyle(redStyle);
                    }
                }

                row.createCell(col++).setCellValue(student.getSolvedCount());
                row.createCell(col++).setCellValue(student.getEarnedPoints());
                row.createCell(col).setCellValue(student.getTotalPoints());
            }

            // Auto-size columns
            for (int i = 0; i <= exercises.size() + 4; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate XLSX", e);
        }
    }

    // ── Publish solutions ─────────────────────────────────────────────────── //

    /** Owner-only toggle. Flips {@code solutionsPublished}, which controls whether solution fields leak into exercise DTOs. */
    @Override
    @Transactional
    public Response<LabDTO> publishSolutions(Long orgId, Long labId) {
        findOrgOrThrow(orgId);
        User currentUser = userService.getCurrentLoggedInUser();
        assertOrgOwner(orgId, currentUser);

        Lab lab = labRepository.findById(labId)
                .orElseThrow(() -> new NotFoundException("Lab not found: " + labId));

        // Toggle rather than set — same endpoint both publishes and unpublishes.
        lab.setSolutionsPublished(!lab.getSolutionsPublished());
        Lab saved = labRepository.save(lab);

        String action = saved.getSolutionsPublished() ? "published" : "unpublished";
        log.info("Solutions {} for lab '{}' by {}", action, saved.getTitle(), currentUser.getUsername());

        return ok(toLabDTO(saved, currentUser, true));
    }

    // ── Internal helpers ──────────────────────────────────────────────────── //

    private Organization findOrgOrThrow(Long orgId) {
        return orgRepository.findById(orgId)
                .orElseThrow(() -> new NotFoundException("Organization not found: " + orgId));
    }

    /** Passes if the caller is a platform ADMIN or holds any membership row in the org. */
    private void assertOrgMember(Long orgId) {
        User currentUser = userService.getCurrentLoggedInUser();
        if (hasPlatformRole(currentUser, "ADMIN")) return; // platform admins can read any org's labs

        if (!memberRepository.existsByOrganizationIdAndUserId(orgId, currentUser.getId())) {
            throw new UnauthorizedAccessException("You are not a member of this organization");
        }
    }

    /** Passes for platform ADMIN, org OWNER, or org ADMIN. (Currently unused by lab flows, which require OWNER.) */
    private void assertOrgAdminOrOwner(Long orgId, User user) {
        if (hasPlatformRole(user, "ADMIN")) return;

        OrganizationMember membership = memberRepository.findByOrganizationIdAndUserId(orgId, user.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("You are not a member of this organization"));

        if (membership.getRole() != OrganizationMemberRole.OWNER
                && membership.getRole() != OrganizationMemberRole.ADMIN) {
            throw new UnauthorizedAccessException("Only organization owners and admins can perform this action");
        }
    }

    /**
     * Strictest gate: only the single org OWNER (or a platform ADMIN) passes.
     * All lab mutations use this — org ADMINs are intentionally excluded from managing labs.
     */
    private void assertOrgOwner(Long orgId, User user) {
        if (hasPlatformRole(user, "ADMIN")) return;

        OrganizationMember membership = memberRepository.findByOrganizationIdAndUserId(orgId, user.getId())
                .orElseThrow(() -> new UnauthorizedAccessException("You are not a member of this organization"));

        if (membership.getRole() != OrganizationMemberRole.OWNER) {
            throw new UnauthorizedAccessException("Only the organization owner can perform this action");
        }
    }

    // Platform-level (not org-level) role check, e.g. the global "ADMIN" superuser role. Case-insensitive.
    private boolean hasPlatformRole(User user, String roleName) {
        return user.getRoles().stream().anyMatch(r -> r.getName().equalsIgnoreCase(roleName));
    }

    /**
     * Lab-fairness gate: a problem may enter a lab only if it is private and
     * authored by the caller (platform ADMIN bypasses ownership). Unlike
     * contests there is NO no-prior-submissions requirement and NO
     * auto-publish — lab problems stay private and are reusable across labs.
     */
    private void validateProblemEligibleForLab(Problem problem, User caller) {
        boolean isAdmin = hasPlatformRole(caller, "ADMIN");
        Long authorId = problem.getAuthor() != null ? problem.getAuthor().getId() : null;

        if (!isAdmin && (authorId == null || !authorId.equals(caller.getId()))) {
            throw new BadRequestException(
                    "You can only add problems you authored: '" + problem.getTitle() + "'");
        }
        if (Boolean.TRUE.equals(problem.getIsPublic())) {
            throw new BadRequestException(
                    "Lab problems must be private: '" + problem.getTitle() + "'");
        }
    }

    /**
     * Best-effort current-user lookup for endpoints that behave differently when
     * authenticated but must not fail for anonymous callers — returns null instead
     * of throwing so per-student progress fields simply stay unpopulated.
     */
    private User tryGetCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                return userService.getCurrentLoggedInUser();
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ── DTO mappers ───────────────────────────────────────────────────────── //

    /**
     * Maps a lab to its DTO. When {@code currentUser} is non-null, also computes that
     * user's solved/attempted rollup; {@code includeExercises} adds the full exercise
     * list (detail view only) to keep list responses lightweight.
     */
    private LabDTO toLabDTO(Lab lab, User currentUser, boolean includeExercises) {
        List<LabExercise> exercises = exerciseRepository.findByLabIdOrderByExerciseOrderAsc(lab.getId());

        LabDTO dto = LabDTO.builder()
                .id(lab.getId())
                .organizationId(lab.getOrganization().getId())
                .title(lab.getTitle())
                .slug(lab.getSlug())
                .description(lab.getDescription())
                .deadline(lab.getDeadline())
                .solutionsPublished(lab.getSolutionsPublished())
                .creatorUsername(lab.getCreator() != null ? lab.getCreator().getUsername() : null)
                .exerciseCount(exercises.size())
                .totalPoints(exercises.stream().mapToInt(e -> e.getPoints() != null ? e.getPoints() : 0).sum())
                .createdAt(lab.getCreatedAt())
                .updatedAt(lab.getUpdatedAt())
                .build();

        // Student progress summary
        if (currentUser != null) {
            int solved = 0;
            int attempted = 0;
            for (LabExercise ex : exercises) {
                boolean hasAC = submissionRepository.existsByUserIdAndProblemIdAndLabIdAndSubmissionVerdict(
                        currentUser.getId(), ex.getProblem().getId(), lab.getId(), SubmissionVerdict.AC);
                if (hasAC) {
                    solved++;
                } else {
                    long count = submissionRepository.countByUserIdAndProblemIdAndLabId(
                            currentUser.getId(), ex.getProblem().getId(), lab.getId());
                    if (count > 0) attempted++;
                }
            }
            dto.setSolvedCount(solved);
            dto.setAttemptedCount(attempted);
        }

        // Exercise details are expensive (per-exercise submission queries) so only build them for the detail view.
        if (includeExercises) {
            List<LabExerciseDTO> exerciseDTOs = exercises.stream()
                    .map(ex -> toExerciseDTO(ex, lab, currentUser))
                    .collect(Collectors.toList());
            dto.setExercises(exerciseDTOs);
        }

        return dto;
    }

    private LabExerciseDTO toExerciseDTO(LabExercise ex, Lab lab, User currentUser) {
        Problem p = ex.getProblem();

        LabExerciseDTO dto = LabExerciseDTO.builder()
                .id(ex.getId())
                .exerciseOrder(ex.getExerciseOrder())
                .points(ex.getPoints())
                .problemId(p.getId())
                .problemTitle(p.getTitle())
                .problemSlug(p.getSlug())
                .problemDifficulty(p.getProblemDifficulty() != null ? p.getProblemDifficulty().name() : null)
                .build();

        // Solution fields are the sensitive part: only expose them once the owner has published solutions.
        if (Boolean.TRUE.equals(lab.getSolutionsPublished())) {
            if (p.getSolutionFileUrl() != null) {
                dto.setSolutionFileUrl(p.getSolutionFileUrl());
            }
            if (p.getSolutionCode() != null) {
                dto.setSolutionCode(p.getSolutionCode());
                dto.setSolutionLanguage(p.getSolutionLanguage());
            }
        }

        // Student status
        if (currentUser != null) {
            boolean hasAC = submissionRepository.existsByUserIdAndProblemIdAndLabIdAndSubmissionVerdict(
                    currentUser.getId(), p.getId(), lab.getId(), SubmissionVerdict.AC);
            long subCount = submissionRepository.countByUserIdAndProblemIdAndLabId(
                    currentUser.getId(), p.getId(), lab.getId());

            if (hasAC) {
                dto.setStatus("SOLVED");
                dto.setBestVerdict("AC");
            } else if (subCount > 0) {
                dto.setStatus("ATTEMPTED");
                dto.setBestVerdict("WA");
            } else {
                dto.setStatus("NOT_STARTED");
            }
            dto.setSubmissionCount((int) subCount);
        }

        return dto;
    }

    // ── Slug generation ───────────────────────────────────────────────────── //

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    // Normalizes a title into a URL-safe slug: strip accents/diacritics, spaces -> dashes, lowercase, collapse dashes.
    private String generateSlug(String input) {
        String noWhitespace = WHITESPACE.matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(noWhitespace, Normalizer.Form.NFD);
        String slug = NON_LATIN.matcher(normalized).replaceAll("")
                .toLowerCase(java.util.Locale.ENGLISH)
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
        return slug.isEmpty() ? "lab" : slug;
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private void createCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private <T> Response<T> ok(T data) {
        return Response.<T>builder()
                .statusCode(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
    }
}
