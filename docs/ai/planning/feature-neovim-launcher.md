---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Scaffold a working Raycast extension with one launcher command and configurable project source.
- [x] Milestone 2: Implement WezTerm-backed launching with a reusable terminal abstraction.
- [ ] Milestone 3: Validate behavior with tests and manual launch checks.

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Research the current Raycast manifest, preferences, and list APIs from official docs.
- [x] Task 1.2: Research the current WezTerm CLI flow for opening a new tab in a target directory.
- [x] Task 1.3: Scaffold the extension project structure, manifest, TypeScript config, and base command entry point.
- [x] Task 1.4: Define a user-editable project configuration format and preference wiring.

### Phase 2: Core Features
- [x] Task 2.1: Build the project loader, parser, and validation layer.
- [x] Task 2.2: Implement the terminal launcher interface and WezTerm adapter.
- [x] Task 2.3: Build the Raycast list UI, selection action, success feedback, and error states.
- [x] Task 2.4: Update the WezTerm launch path from forced new windows to new tabs after the 2026-03-28 requirement change.

### Phase 3: Integration & Polish
- [x] Task 3.1: Add automated tests for config parsing and terminal command construction.
- [x] Task 3.2: Add manual verification notes and refine UX for missing configuration or missing binaries.
- [x] Task 3.3: Update lifecycle docs with implementation and testing outcomes.

## Dependencies
**What needs to happen in what order?**

- Official API research should happen before scaffolding to avoid manifest or API drift.
- Scaffolding must exist before project-loading and launch modules can be implemented.
- Config modeling should be settled before list rendering and launch wiring to avoid rework.
- Tests depend on stable module boundaries for config parsing and process invocation.

## Timeline & Estimates
**When will things be done?**

- Research and scaffolding: small, same-session task.
- Core implementation: medium, same-session task.
- Tests and documentation: small to medium, same-session task if environment setup succeeds.
- Buffer is needed for dependency installation and any Raycast-specific tooling issues in a fresh repository.

## Risks & Mitigation
**What could go wrong?**

- Risk: Raycast scaffolding details may have changed.
- Mitigation: use official Raycast docs as the source of truth before creating files.

- Risk: WezTerm CLI behavior may differ when no GUI instance exists.
- Mitigation: use documented CLI commands and design error handling that reports failure cleanly.

- Risk: Configuring many projects through Raycast preferences directly may be awkward.
- Mitigation: store project definitions in a dedicated local JSON file referenced by a single preference.

- Risk: Fresh repo state without commits prevents worktree isolation.
- Mitigation: continue in-place and document the limitation; create commits later once the repo is ready.

## Resources Needed
**What do we need to succeed?**

- Raycast extension runtime dependencies and TypeScript tooling.
- Official Raycast documentation for manifest and UI APIs.
- Official WezTerm CLI documentation for tab spawning.
- Local manual testing with WezTerm and `nvim` installed.

## Status Notes
**What happened during execution?**

- The repo started without any commits, so the worktree-first flow had to fall back to the current repository on branch `feature-neovim-launcher`.
- The extension now builds successfully to `dist/`, passes `ray lint`, and passes the local Vitest suite.
- The requirement changed on 2026-03-28 from "open a new window" to "open a new tab," so the launcher implementation and docs were revised to follow WezTerm's tab-oriented CLI flow.
- Manual in-Raycast verification is still pending because the command was not imported into a live Raycast development session in this run.
