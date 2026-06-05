# Contest Submission Privacy (Fairness) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the contest-fairness leak: user B can open user A's public profile (or hit the public submission API) during a RUNNING contest and read A's accepted source code. Adopt the LeetCode model: source code is **owner-only by default**, contest submissions are **invisible to others while the contest runs**, and (optionally, Phase 2) accepted contest solutions become viewable from the leaderboard **after the contest ends**.

**Architecture:** Two public backend endpoints leak code today: `GET /api/users/{username}/submissions` (returns every submission of any user, `sourceCode` included, no contest filter) and `GET /api/submissions/{id}/status` (any submission's full code by ID). Fix is server-side, viewer-aware filtering: resolve the viewer from `SecurityContextHolder` (endpoint stays public — anonymous = "not owner"), exclude submissions belonging to currently-running contests from non-owner views, and null out `sourceCode`/`errorMessage` for non-owners (the `@JsonInclude(NON_NULL)` on `SubmissionDTO` drops them from JSON). Frontend ProfilePage hides the code-view affordance when `sourceCode` is absent. No schema changes.

**Tech Stack:** Spring Boot 3.5 / Spring Security 6 (SecurityContext), Spring Data JPA; React 19 frontend. No new dependencies.

---

## How LeetCode handles it (research)

|