---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals

**What level of testing do we aim for?**

- Cover all new discovery, storage, and merge logic with unit tests.
- Cover failure branches for invalid roots, duplicates, and missing paths.
- Manually verify the Raycast form-driven bootstrap and refresh flows.

## Unit Tests

**What individual components need testing?**

### Discovery Module

- [x] Detect directories containing `.git`.
- [x] Exclude linked Git worktree checkouts using Git metadata while still accepting normal gitfile-based repositories.
- [x] Ignore missing roots and invalid entries with clear errors.
- [x] Deduplicate repeated search roots and detected path results.

### Storage and Project Catalog

- [x] Persist and reload search roots, detected projects, and manual projects.
- [x] Merge manual and detected projects with manual precedence.
- [x] Preserve first-launch completion state even when discovery returns zero projects.

## Integration Tests

**How do we test component interactions?**

- [ ] Launcher loads stored catalog without rescanning.
- [ ] Refresh flow saves roots and updates the detected catalog.
- [ ] Manual add flow saves a new project and makes it visible to the launcher.

## End-to-End Tests

**What user flows need validation?**

- [ ] First launch prompts for roots and builds the initial project list.
- [ ] Returning launch opens from the saved list.
- [ ] Refresh after cloning a new repo adds it to the list.
- [ ] Manual add recovers a project not covered by scan roots.

## Test Data

**What data do we use for testing?**

- Temporary directories with real Git repositories created by `git init` and `git init --separate-git-dir`.
- Temporary linked-worktree fixtures created by `git worktree add`.
- Storage mocks for Raycast local storage interactions.

## Test Reporting & Coverage

**How do we verify and communicate test results?**

- `npm run test`: passed with 4 test files and 11 tests, including discovery coverage for linked Git worktree exclusion.
- `npm run build`: passed after allowing Raycast to write build output outside the workspace sandbox.
- `npm run lint`: ESLint and Prettier passed, but Raycast manifest validation failed because `package.json` still references an invalid Raycast author account (`vaduc079`).
- Manual Raycast validation is still needed for in-app form UX and command discoverability.

## Manual Testing

**What requires human validation?**

- First-launch form UX in Raycast.
- Command discoverability and command titles in Raycast.
- Launching a detected or manually added project through WezTerm.
- Refresh behavior after cloning a new local Git repository into a configured search root.
- Confirm that linked Git worktree checkouts do not appear in the Raycast project list after refresh.

## Performance Testing

**How do we validate performance?**

- Smoke test discovery on a root containing multiple repositories.

## Bug Tracking

**How do we manage issues?**

- Treat incorrect project detection, duplicate catalog entries, and broken first-launch bootstrap as release-blocking regressions.
