---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones

**What are the major checkpoints?**

- [x] Milestone 1: Replace the external config-file dependency with extension-managed project storage.
- [x] Milestone 2: Implement Git-project discovery, first-launch bootstrap, and manual project management commands.
- [x] Milestone 3: Verify the new flows with tests, linting, and lifecycle documentation updates.

## Task Breakdown

**What specific work needs to be done?**

### Phase 1: Foundation

- [x] Task 1.1: Add feature-scoped lifecycle docs for requirements, design, planning, implementation, and testing.
- [x] Task 1.2: Introduce shared project normalization and storage primitives backed by Raycast local storage.
- [x] Task 1.3: Update the extension manifest and preferences to remove the required external config-file dependency.

### Phase 2: Core Features

- [x] Task 2.1: Implement recursive Git-project discovery from user-provided search roots.
- [x] Task 2.2: Build the first-launch bootstrap flow inside `launch-project`.
- [x] Task 2.3: Add `Refresh Project List` command to edit scan roots and rebuild detected projects.
- [x] Task 2.4: Add `Add New Project` command and merge manual entries into the launcher catalog.
- [x] Task 2.5: Exclude linked Git worktree checkouts from auto-discovery using Git metadata rather than path conventions.

### Phase 3: Integration & Polish

- [x] Task 3.1: Replace outdated config-file tests with unit coverage for discovery, storage, and merge behavior.
- [x] Task 3.2: Add command-level validation and error messaging for invalid roots, missing paths, and duplicate projects.
- [x] Task 3.3: Update implementation/testing docs with verification outcomes and any remaining manual checks.

## Dependencies

**What needs to happen in what order?**

- Storage and shared project modeling should be introduced before command rewiring.
- Discovery logic must exist before the first-launch and refresh command UIs can be completed.
- Manual project persistence depends on the final merge and duplicate-resolution rules.
- Tests should be updated after the new storage and discovery seams are stable.

## Timeline & Estimates

**When will things be done?**

- Lifecycle docs and manifest updates: small, same-session task.
- Discovery and storage implementation: medium, same-session task.
- Command wiring and UI validation: medium, same-session task.
- Tests and verification: small to medium, same-session task if Raycast tooling and local filesystem mocks behave as expected.

## Risks & Mitigation

**What could go wrong?**

- Risk: recursive scans may become slow on large roots.
- Mitigation: stop descending into `.git` directories, ignore symlink traversal, persist results so scans are infrequent, and keep worktree detection limited to candidate directories that already expose a `.git` entry.

- Risk: Raycast local storage may be a poor fit for large payloads.
- Mitigation: store compact project metadata only and keep search roots separate from manual entries.

- Risk: duplicate paths across manual and detected sources could create ambiguous launch entries.
- Mitigation: normalize paths centrally and enforce one merged entry per path with manual precedence.

- Risk: first-launch UX may become confusing if discovery finds nothing.
- Mitigation: persist completion state, show clear empty states, and direct users to refresh or add projects manually.

## Resources Needed

**What do we need to succeed?**

- Raycast local storage and form APIs.
- Existing WezTerm launcher integration.
- Vitest coverage for shared logic.
- Manual validation in a live Raycast session for the new command flows.

## Status Notes

**What happened during execution?**

- Feature work is isolated in worktree `.worktrees/feature-project-auto-discovery` on branch `feature-project-auto-discovery`.
- Base lifecycle lint passed after rerunning `npx ai-devkit@latest lint` with `npm_config_cache=/tmp/npm-cache`.
- Memory search could not be used because the local `ai-devkit` memory database was unavailable in this environment (`unable to open database file`).
- The external JSON config-file preference was removed and replaced with Raycast local storage for search roots, detected projects, and manual projects.
- Three Raycast commands now exist: `Launch Project`, `Add New Project`, and `Refresh Project List`.
- Requirement/design refinement on 2026-03-29 clarified that linked Git worktree checkouts must be excluded using Git metadata instead of `.worktrees` path heuristics.
- `src/project-discovery.ts` now excludes linked Git worktree checkouts while still accepting standard repositories that expose `.git` as either a directory or a non-worktree gitfile.
- Verification results:
  - `npm run test`: passed.
  - `npm test -- src/project-discovery.test.ts`: passed after adding a regression for linked worktree exclusion.
  - `npm run build`: passed after requesting permission to write Raycast build output outside the workspace sandbox.
  - `npm run lint`: ESLint and Prettier passed, but Raycast manifest validation still fails because `package.json` contains `author: "vaduc079"`, which Raycast currently reports as an invalid author account.
