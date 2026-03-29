---
phase: implementation
title: Implementation Notes & Progress
description: Track implementation progress, decisions, and noteworthy details
---

# Implementation Notes & Progress

## Status

- Phase 4 implementation is complete in code for the focus-or-spawn behavior.
- Remaining work is limited to manual WezTerm validation before final lifecycle closure.

## Completed Changes

- `src/terminals.ts` now resolves launch targets before spawning by calling `wezterm cli list --format json`.
- Pane cwd values are normalized from WezTerm `file:///...` URLs into filesystem paths before exact comparison with the selected project path.
- Candidate panes are filtered to those with matching cwd and usable `tty_name`, then inspected with `ps -t <tty> -o state= -o comm=` to find the foreground process.
- The first pane returned by WezTerm whose foreground command basename matches the editor command basename is activated with `wezterm cli activate-pane --pane-id <id>`.
- When pane metadata is missing, `ps` inspection fails, or the pane list cannot be parsed, the launcher falls back to the existing `wezterm cli spawn --cwd ... -- nvim` flow.
- The existing WezTerm error mapping remains in place for missing executables and CLI failures.

## Files Touched

- `src/terminals.ts`
- `src/terminals.test.ts`

## Implementation Notes

- The matching rule remains intentionally strict: exact normalized cwd equality plus a foreground process basename equal to `nvim`.
- The parser keeps only the pane fields needed for this feature so malformed or extra WezTerm metadata does not expand the launcher surface area unnecessarily.
- `ps` failures are treated as non-matching panes instead of hard launch failures so local inspection issues do not block opening a project.
