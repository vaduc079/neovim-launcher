---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup

**How do we get started?**

- Worktree: `.worktrees/feature-persist-search-roots-and-blacklist`
- Branch: `feature-persist-search-roots-and-blacklist`
- Dependencies are bootstrapped with `npm ci` using `npm_config_cache=/tmp/npm-cache` because the default user npm cache contains root-owned files in this environment.

## Code Structure

**How is the code organized?**

- `src/search-roots-form.tsx`
  - Shared discovery settings form for both first-launch bootstrap and refresh.
- `src/project-store.ts`
  - Persists search roots, blacklist folders, and detected projects in Raycast local storage.
- `src/project-discovery.ts`
  - Validates discovery settings, scans filesystem trees, and skips blacklisted subtrees before recursion.

## Implementation Notes

**Key technical details to remember:**

### Core Features

- Persisted discovery settings:
  - Search roots and blacklist folders are stored together in the discovery state so both commands hydrate from one source of truth.
- Async form hydration fix:
  - The shared form keeps two local textarea values and resynchronizes them when saved settings arrive after the initial render.
- Blacklist-aware traversal:
  - Discovery checks whether the current directory matches or sits under a blacklisted path before probing Git metadata or traversing child entries.

### Patterns & Best Practices

- Use explicit intermediate types for discovery input, persisted state, and form draft state.
- Keep path parsing and textarea synchronization in pure helpers so they stay testable without a UI renderer.
- Preserve backward compatibility by treating missing `blacklistRoots` in old stored JSON as an empty list.

## Integration Points

**How do pieces connect?**

- `launch-project.tsx` passes saved discovery settings into the shared form when first-launch bootstrap is needed.
- `refresh-project-list.tsx` loads saved settings and passes them into the same form for editing.
- `saveDiscoveryResult()` persists the submitted settings together with detected projects so later sessions rehydrate correctly.

## Error Handling

**How do we handle failures?**

- Invalid or missing search roots raise the existing search-root errors.
- Invalid or missing blacklist folders now raise blacklist-specific validation errors.
- Unreadable filesystem paths and Git probe failures still surface as `ProjectError` instances for consistent Raycast toasts.

## Performance Considerations

**How do we keep it fast?**

- Blacklisted directories are skipped before recursive descent, reducing unnecessary directory reads and Git probes.
- Launcher reads remain storage-backed and do not rescan the filesystem automatically.

## Security Notes

**What security measures are in place?**

- All submitted paths continue to be normalized and validated through shared path helpers before saving or scanning.
- The extension continues to use Node filesystem APIs and local storage only; no new external services are introduced.

## Outcome Notes

**What shipped in this implementation?**

- The refresh and bootstrap form now exposes both `Search Roots` and `Blacklist Folders`.
- Saved discovery settings now rehydrate correctly after async storage reads complete.
- Discovery state remains backward compatible with older saved JSON that does not include blacklist folders.
- Blacklisted directories are skipped before recursion, so nested repositories inside ignored folders are never detected.
