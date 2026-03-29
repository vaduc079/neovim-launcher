---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals

**What level of testing do we aim for?**

- Unit coverage for changed storage, discovery, and helper logic.
- Integration-style filesystem coverage for blacklist traversal behavior in `src/project-discovery.test.ts`.
- Manual validation of the Raycast bootstrap and refresh forms after automated checks pass.

## Unit Tests

**What individual components need testing?**

### Project Store

- [x] Test case 1: save discovery results with blacklist folders and surface them in catalog state.
- [x] Test case 2: preserve backward compatibility when stored discovery state does not contain `blacklistRoots`.
- [x] Additional coverage: manual project precedence still works after the discovery state change.

### Project Discovery

- [x] Test case 1: continue to include primary repositories and exclude linked Git worktree checkouts.
- [x] Test case 2: skip blacklisted folders and all nested repositories while keeping sibling directories discoverable.
- [ ] Additional coverage: blacklist validation error paths and full Raycast form rendering are not covered by the current automated suite.

## Integration Tests

**How do we test component interactions?**

- [x] Filesystem-backed discovery scenarios using temporary Git repositories.
- [x] Storage-and-merge scenarios using mocked Raycast local storage.
- [ ] Command-level interaction tests are still manual because the repo does not currently use a dedicated React component test renderer.

## End-to-End Tests

**What user flows need validation?**

- [ ] First-launch bootstrap saves search roots and blacklist folders, then builds the project list.
- [ ] Refresh Project List opens with the previously saved settings populated.
- [ ] Blacklisted folders are skipped during refresh in a live Raycast session.

## Test Data

**What data do we use for testing?**

- Temporary directories with Git repositories, separate Git dirs, and linked worktrees.
- Mocked Raycast local storage values for persisted discovery state.

## Test Reporting & Coverage

**How do we verify and communicate test results?**

- Verification results:
  - `npm run test`: passed.
  - `env npm_config_cache=/tmp/npm-cache npx ai-devkit@latest lint --feature persist-search-roots-and-blacklist`: passed.
  - `npm run build`: passed after granting write access to the Raycast extension output directory.
  - `npm run lint`: partially blocked by an existing Raycast manifest validation error for `package.json -> author: "vaduc079"`. ESLint and Prettier both passed.
- Coverage gaps:
  - The suite covers storage and filesystem behavior, but full rendered form hydration still relies on manual validation because no UI test renderer is installed.

## Manual Testing

**What requires human validation?**

- Confirm the refresh form shows saved search roots and blacklist folders after reopening the command.
- Confirm a blacklisted folder is skipped even when nested inside a valid search root.
- Confirm manual projects remain visible after a refresh that changes discovery settings.
