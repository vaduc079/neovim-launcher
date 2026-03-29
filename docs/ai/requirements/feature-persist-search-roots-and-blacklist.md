---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement

**What problem are we solving?**

- Auto-discovery already asks users for search roots, but the refresh flow still behaves like those roots were not saved because the form opens without the previously stored values populated.
- This forces users to re-enter the same directories every time they want to refresh the detected project list.
- Users also cannot exclude noisy or intentionally ignored folders inside those roots, so discovery spends time scanning paths that should never produce launchable projects.

## Goals & Objectives

**What do we want to achieve?**

- Persist search root configuration in a way that is actually reusable across first launch and later refreshes.
- Let users define a blacklist of folders that discovery must skip entirely, including all descendants under those folders.
- Keep the rest of the discovery flow unchanged: manual projects remain separate, refresh stays explicit, and the launcher continues reading persisted project data.

- Non-goals:
- Add file watchers or automatic rescans when the filesystem changes.
- Introduce pattern-based ignore rules such as glob syntax or regular expressions.
- Apply blacklist rules to manually added projects.
- Change the WezTerm or Neovim launch behavior.

## User Stories & Use Cases

**How will users interact with the solution?**

- As a returning user, I want Refresh Project List to prefill my saved search roots so I only edit them when they change.
- As a user with large monorepo or archive directories, I want to blacklist specific folders so discovery skips them and everything nested inside them.
- As a first-time user, I want the initial project build form to save both my search roots and blacklist settings for future refreshes.
- As a user, I want refresh to continue merging detected projects with manual projects without losing manual entries.

- Key workflows:
- First launch with no discovery state collects search roots and optional blacklist folders, runs discovery, and saves both settings.
- Refresh Project List loads the saved search roots and blacklist folders into the form, lets the user edit them, then rebuilds detected projects.
- Discovery skips any directory whose normalized path matches a blacklisted folder or is nested beneath one.

- Edge cases:
- A blacklisted folder is identical to a configured search root.
- A blacklisted folder is nested inside another blacklisted folder.
- Search roots or blacklist entries contain duplicates, `~`, or trailing slashes.
- A blacklisted folder does not exist anymore.
- A detected Git repository lives inside a blacklisted folder and must not be included.

## Success Criteria

**How will we know when we're done?**

- Refresh Project List opens with the last saved search roots already shown.
- The extension stores blacklist folders together with discovery state and reloads them after restart.
- Discovery never scans into a blacklisted directory and never includes a project inside that subtree.
- Existing manual project behavior and duplicate-resolution rules continue to work.
- Automated tests cover the saved-form-state regression and blacklist traversal behavior.

## Constraints & Assumptions

**What limitations do we need to work within?**

- The extension still uses Raycast local storage as the persistence layer.
- Blacklist handling should be path-based and deterministic, using normalized absolute directory paths.
- Validation rules for blacklist folders should match search roots closely enough that users get immediate, actionable errors for invalid paths.
- The implementation should keep the code easy to reason about and avoid introducing a separate persistence system just for discovery settings.

## Questions & Open Items

**What do we still need to clarify?**

- Assumption: blacklist folders should be entered one absolute path or `~/path` per line, matching the existing search-root input style.
- Assumption: if a folder is blacklisted, that exact folder and every nested directory under it are skipped, even if a nested directory is also listed as a search root.
- Assumption: missing blacklist folders should fail validation the same way missing search roots do, so users do not silently save stale paths.
- Note: the current “roots are not persisted” complaint appears to come from a UI-state bug rather than missing storage, so the fix must cover both persistence and form hydration.
