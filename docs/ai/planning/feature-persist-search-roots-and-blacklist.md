---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones

**What are the major checkpoints?**

- [x] Milestone 1: Persist and hydrate discovery settings for both bootstrap and refresh flows.
- [x] Milestone 2: Add blacklist-aware traversal so ignored folders and descendants are skipped during discovery.
- [x] Milestone 3: Verify the enhancement with unit tests and updated lifecycle docs.

## Task Breakdown

**What specific work needs to be done?**

### Phase 1: Foundation

- [x] Task 1.1: Add feature-scoped lifecycle docs for requirements, design, planning, implementation, and testing.
- [x] Task 1.2: Extend the discovery state model to store blacklist folders and expose them to command view state.

### Phase 2: Core Features

- [x] Task 2.1: Update the shared discovery form to edit search roots and blacklist folders together.
- [x] Task 2.2: Fix async form hydration so previously saved discovery settings populate after storage reads complete.
- [x] Task 2.3: Update project discovery to validate blacklist folders and skip blacklisted subtrees before recursion.

### Phase 3: Integration & Polish

- [x] Task 3.1: Add or update tests for stored discovery settings, form-state hydration behavior, and blacklist traversal.
- [x] Task 3.2: Run build, test, and lint verification in the feature worktree.
- [x] Task 3.3: Record implementation and testing outcomes in lifecycle docs.

## Dependencies

**What needs to happen in what order?**

- Storage updates should land before command wiring so both forms can read and write the same state shape.
- Form updates depend on the final discovery state contract.
- Discovery blacklist logic depends on shared path normalization helpers.
- Verification should happen after the storage and traversal seams settle.

## Timeline & Estimates

**When will things be done?**

- Discovery-state and form changes: small to medium, same session.
- Blacklist traversal and validation: medium, same session.
- Tests and lifecycle documentation updates: small to medium, same session.

## Risks & Mitigation

**What could go wrong?**

- Risk: extending stored discovery state could break existing saved JSON parsing.
- Mitigation: treat missing `blacklistRoots` as an empty array for backward compatibility.

- Risk: blacklist matching could accidentally skip sibling directories with similar prefixes.
- Mitigation: use normalized path-boundary checks rather than raw string prefix tests.

- Risk: the refresh-form fix could still miss late prop updates.
- Mitigation: explicitly synchronize textarea state in a `useEffect` keyed by the incoming values.

## Resources Needed

**What do we need to succeed?**

- Raycast local storage APIs and existing command structure.
- Filesystem-based discovery tests with temporary Git repositories.
- Existing lifecycle docs as reference patterns.

## Status Notes

**What happened during execution?**

- Feature work is isolated in worktree `.worktrees/feature-persist-search-roots-and-blacklist` on branch `feature-persist-search-roots-and-blacklist`.
- Base lifecycle lint passed with `npm_config_cache=/tmp/npm-cache`.
- `ai-devkit` memory search could not be used because the local database was unavailable (`unable to open database file`).
- Initial code review found that search roots are already persisted in storage, but the refresh form fails to hydrate them because local textarea state is only initialized on first render.
- Implementation completed by adding persisted blacklist folders to discovery state, simplifying the shared form state, and adding blacklist-aware traversal in `src/project-discovery.ts`.
- Verification results:
  - `npm run test`: passed.
  - `env npm_config_cache=/tmp/npm-cache npx ai-devkit@latest lint --feature persist-search-roots-and-blacklist`: passed.
  - `npm run build`: passed after allowing Raycast to write compiled output into `~/.config/raycast/extensions/neovim-launcher`.
  - `npm run lint`: ESLint and Prettier passed, but Raycast manifest validation still fails because `package.json` contains `author: "vaduc079"`, which Raycast reports as an invalid author account.
