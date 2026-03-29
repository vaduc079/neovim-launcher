---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones

**What are the major checkpoints?**

- [x] Milestone 1: Clarify matching rules, fallback behavior, and feature scope for existing-pane focusing.
- [x] Milestone 2: Implement WezTerm pane inspection, Neovim matching, and focus-or-spawn behavior.
- [ ] Milestone 3: Verify the enhancement with unit tests and manual WezTerm checks.

## Task Breakdown

**What specific work needs to be done?**

### Phase 1: Foundation

- [x] Task 1.1: Create feature-scoped lifecycle docs for requirements, design, planning, implementation, and testing.
- [x] Task 1.2: Define parsing helpers for WezTerm pane list output and tty-based foreground-process inspection.

### Phase 2: Core Features

- [x] Task 2.1: Extend the WezTerm launcher to resolve whether a selected project already has a matching pane.
- [x] Task 2.2: Activate the matched pane with `wezterm cli activate-pane` when an exact cwd + `nvim` match is found.
- [x] Task 2.3: Preserve the current `wezterm cli spawn --cwd ... -- nvim` flow as the fallback when no match exists.
- [x] Task 2.4: Decide and encode a deterministic rule for multiple exact matches.

### Phase 3: Integration & Polish

- [x] Task 3.1: Add unit tests for exact matches, non-`nvim` panes, missing tty metadata, multiple matches, and spawn fallback.
- [ ] Task 3.2: Run build/test verification and capture manual validation notes for focus and spawn behavior.
- [x] Task 3.3: Update implementation/testing lifecycle docs with outcomes and any remaining gaps.

## Dependencies

**What needs to happen in what order?**

- Pane-list parsing and tty foreground-process inspection must exist before the launcher can decide between focus and spawn.
- Match resolution should be implemented before error handling is refined so the fallback rules are clear.
- Tests should be added after the resolution helpers stabilize.
- Manual validation depends on a working local WezTerm environment with at least one open `nvim` pane.

## Timeline & Estimates

**When will things be done?**

- Lifecycle docs and design validation: small, same-session task.
- WezTerm resolution and launch-path changes: small to medium, same-session task.
- Unit tests and manual verification: small to medium, same-session task.

## Risks & Mitigation

**What could go wrong?**

- Risk: WezTerm pane metadata may omit `tty_name` or cwd in some cases.
- Mitigation: ignore incomplete panes and fall back to spawning a new tab.

- Risk: `ps` output parsing may differ across environments.
- Mitigation: keep the command format explicit and parse only the fields needed for the foreground command.

- Risk: multiple matching panes may lead to non-obvious focus behavior.
- Mitigation: choose a deterministic winner and document the rule in tests.

- Risk: `activate-pane` may not bring WezTerm to the foreground on macOS.
- Mitigation: accept pane activation alone in v1 and revisit app activation separately if manual validation shows a gap.

## Resources Needed

**What do we need to succeed?**

- Local WezTerm CLI with `list` and `activate-pane` support.
- macOS `ps` access for tty process inspection.
- Existing Raycast launcher integration and Vitest coverage.

## Status Notes

**What happened during execution?**

- Feature work is isolated in worktree `.worktrees/feature-focus-existing-neovim-pane` on branch `feature-focus-existing-neovim-pane`.
- Base lifecycle lint passed after rerunning `npx ai-devkit@latest lint` outside the sandbox.
- Clarification on 2026-03-29 confirmed that matching requires exact cwd equality plus a foreground process named `nvim`.
- Clarification on 2026-03-29 also confirmed that v1 only needs `wezterm cli activate-pane`; separate app-frontmost behavior can be revisited later.
- Clarification on 2026-03-29 confirmed that when multiple panes match, the first pane returned by `wezterm cli list` wins.
- Local investigation on 2026-03-29 showed that `wezterm cli list --format json` returns `pane_id`, `cwd`, and `tty_name`, and that `ps -t <tty>` identifies foreground `nvim` processes for those panes.
- Phase 4 execution on 2026-03-29 updated `src/terminals.ts` to list WezTerm panes, normalize `file:///` cwd values, inspect tty foreground processes via `ps`, and choose between `activate-pane` and `spawn`.
- Phase 4 execution on 2026-03-29 also updated `src/terminals.test.ts` with coverage for exact matches, non-`nvim` panes, missing tty metadata, deterministic first-match behavior, malformed pane data fallback, and missing-WezTerm errors.
- Verification on 2026-03-29 passed with `npm test`, `npm test -- src/terminals.test.ts`, `npx tsc --noEmit`, and `npx eslint src/terminals.ts src/terminals.test.ts`.
- `npm run lint` still reports an unrelated existing package metadata issue in `package.json` for author `vaduc079`, so manual WezTerm focus/spawn validation remains the main outstanding item before closing Milestone 3.
