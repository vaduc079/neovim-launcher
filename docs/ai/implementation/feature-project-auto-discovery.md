---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup

**How do we get started?**

- Work inside `.worktrees/feature-project-auto-discovery`.
- Install dependencies with `npm ci`.
- Use `npm run lint` and `npm run test` for verification.

## Code Structure

**How is the code organized?**

- `src/launch-project.tsx`
  - Loads the stored project catalog and either renders the first-launch search-root form or the launcher list.
- `src/add-new-project.tsx`
  - Provides the manual project form and persists entries into Raycast local storage.
- `src/refresh-project-list.tsx`
  - Reuses the search-root form to rebuild the detected project catalog on demand.
- `src/search-roots-form.tsx`
  - Shared form component used by first launch and refresh flows.
- `src/project-discovery.ts`
  - Recursively scans search roots for directories containing a `.git` entry, then asks Git whether the checkout is the primary repository worktree before including it.
- `src/project-store.ts`
  - Persists discovery state and manual projects, then merges them into a single launcher catalog.
- `src/projects.ts`
  - Shared project types, path normalization, duplicate resolution helpers, and user-facing project errors.

## Implementation Notes

**Key technical details to remember:**

### Core Features

- First launch now checks for persisted discovery state. If none exists, the launcher shows a setup form instead of failing on a missing config file.
- Search roots are entered as newline-separated absolute or `~/...` paths, normalized, and validated before scanning.
- Discovery treats `.git` as a candidate signal, then runs `git rev-parse --git-dir --git-common-dir` and only includes directories where both paths resolve to the same Git admin directory.
- Manual projects are stored separately from detected projects so refreshes can replace only the detected portion of the catalog.
- Catalog merging uses normalized project paths as the identity key, with manual projects overriding detected metadata on collisions.

### Patterns & Best Practices

- Keep discovery, storage, and UI concerns in separate modules.
- Preserve the existing WezTerm launcher API so launch behavior stays stable.
- Use explicit path validation and typed `ProjectError` objects for all user-facing failures.

## Integration Points

**How do pieces connect?**

- `SearchRootsForm` calls `discoverProjects`, then persists the returned result through `saveDiscoveryResult`.
- `launch-project` reads `getProjectCatalogState`, renders the merged list, and hands the selected project to the existing WezTerm launcher.
- `add-new-project` writes manual entries through `saveManualProject`, which then appear automatically in the merged launcher catalog.

## Error Handling

**How do we handle failures?**

- Invalid roots, relative paths, duplicate manual entries, and corrupted stored data all become `ProjectError` instances with toast-friendly titles and messages.
- Filesystem read failures while scanning nested directories are ignored when they are transient or permission-related, but invalid top-level search roots fail fast.
- Missing launch directories are still validated right before WezTerm launch to avoid stale catalog entries opening broken sessions.

## Performance Considerations

**How do we keep it fast?**

- Persist the discovered catalog and avoid rescanning during normal launches.
- Deduplicate search roots and detected paths before writing storage.
- Sort the catalog once in shared utilities so command UIs stay simple.

## Security Notes

**What security measures are in place?**

- Normalize and validate paths before storing or launching them.
- Use Node filesystem APIs for traversal and limit shelling out to targeted Git metadata checks on candidate directories.
