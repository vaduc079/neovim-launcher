---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement

**What problem are we solving?**

- The extension currently requires users to prepare and maintain a separate JSON config file before they can launch projects.
- This creates a poor setup experience for users with many repositories because adding or updating projects becomes manual bookkeeping.
- The target users are Raycast developers who keep a large number of local Git repositories and want the extension to discover most projects automatically.

## Goals & Objectives

**What do we want to achieve?**

- Remove the requirement for a user-managed project config file during normal usage.
- Build the project list automatically on first launch by scanning user-provided search roots for Git repositories.
- Persist the detected list so launch performance stays fast after the initial scan.
- Let users add manual projects that remain available in addition to auto-detected projects.
- Let users refresh the detected project list on demand after the initial bootstrap.

- Non-goals:
- Auto-refresh the project list on every command launch.
- Detect projects outside the search roots explicitly provided by the user.
- Infer projects from recent files, shell history, or remote Git providers.
- Build a background watcher for filesystem changes.

## User Stories & Use Cases

**How will users interact with the solution?**

- As a first-time user, I want the extension to ask where my projects live and build the list for me so I do not have to hand-author a config file.
- As a user with many repositories, I want project detection to find normal Git repository roots automatically without surfacing linked Git worktree checkouts as separate projects, even when those worktrees do not live under a special parent directory name.
- As a user, I want to add a project manually so I can include directories that were missed or intentionally kept outside my scan roots.
- As a user, I want a refresh command so I can rescan my configured roots after creating or cloning new repositories.
- As a returning user, I want the launcher command to open immediately from the saved project list instead of rescanning every time.

- Key workflows:
- First launch with no built list opens a setup form for scan roots, then saves the detected projects.
- Normal launch reads the persisted project list and lets the user open a project in WezTerm.
- Add New Project stores a manual project entry that is merged into the launcher list.
- Refresh Project List lets the user review search roots and rebuild the auto-detected project set.

- Edge cases:
- A configured search root does not exist or is not a directory.
- A scanned tree contains no Git repositories.
- A scanned tree contains linked Git worktrees that should be skipped.
- A manually added path is missing, invalid, or duplicates an existing project path.
- A detected project and a manual project share the same path.

## Success Criteria

**How will we know when we're done?**

- A first-time user can launch the main command without creating an external config file.
- The first-launch flow accepts one or more search roots and stores the resulting detected project list.
- The main launcher uses the persisted project list on later launches without an automatic rescan.
- The extension exposes `Add New Project` and `Refresh Project List` commands.
- Manually added projects appear together with detected projects in the launcher.
- Auto-discovery excludes Git worktree checkouts based on Git metadata, even when they live under configured search roots or outside a conventional `.worktrees` directory.
- Duplicate paths are handled deterministically and surfaced without corrupting the stored project list.

## Constraints & Assumptions

**What limitations do we need to work within?**

- Project detection should include standard Git repository roots but exclude linked Git worktree checkouts based on Git metadata rather than path naming conventions.
- The extension runs inside Raycast on macOS and should use Raycast-supported local persistence rather than a user-managed file.
- The project catalog should remain small enough for Raycast local storage and list rendering to stay responsive.
- Path handling must expand `~`, normalize directories, and avoid shell-based scanning.
- The existing WezTerm launch flow should remain unchanged apart from the project source.

## Questions & Open Items

**What do we still need to clarify?**

- Assumption: the feature name for lifecycle docs and branch naming is `project-auto-discovery`.
- Assumption: a manual project with the same normalized path as a detected project should override the detected display metadata while preserving a single launcher entry.
- Assumption: first-launch bootstrap only runs automatically when no persisted discovery state exists yet; subsequent updates happen only through `Refresh Project List`.
- Requirement update on 2026-03-29: auto-discovery must skip Git worktree checkouts that would otherwise match the `.git` presence heuristic, using a Git-level detection rule instead of relying on path names such as `.worktrees`.
