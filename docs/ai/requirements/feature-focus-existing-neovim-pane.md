---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement

**What problem are we solving?**

- The launcher currently opens a new WezTerm tab for a project every time, even when that project is already open in Neovim.
- This creates duplicate editor tabs for the same project and breaks the expected "jump back to my existing session" workflow.
- The target user is a Raycast user running local projects in Neovim inside WezTerm on macOS.

## Goals & Objectives

**What do we want to achieve?**

- Reuse an existing WezTerm Neovim pane for the selected project when one is already running.
- Focus the matched WezTerm pane instead of spawning another `nvim` process for the same project.
- Preserve the current spawn flow as a fallback when no matching pane exists.
- Keep the launcher behavior inside the existing WezTerm-only terminal integration.

- Non-goals:
- Support terminals other than WezTerm in this enhancement.
- Detect Neovim sessions nested inside `tmux` or another multiplexer.
- Add macOS-specific app activation beyond WezTerm pane activation in v1 of this enhancement.
- Introduce fuzzy path matching across related directories or parent folders.

## User Stories & Use Cases

**How will users interact with the solution?**

- As a user, I want selecting a project that is already open in Neovim to bring me back to that existing pane so I can resume work without duplicate sessions.
- As a user, I want selecting a project with no open Neovim pane to keep opening a fresh WezTerm tab exactly as it does today.
- As a maintainer, I want the matching logic to stay inside the terminal-launch layer so the Raycast command UI does not need terminal-specific branching.

- Key workflows:
- User selects a project from Raycast.
- The extension asks WezTerm for the current panes.
- If a pane has the exact project cwd and its foreground process is `nvim`, the extension activates that pane.
- If no pane matches, the extension spawns a new WezTerm tab rooted at the selected project and runs `nvim`.

- Edge cases:
- Multiple panes are running `nvim` for the same project path.
- A pane has the correct cwd but the foreground process is a shell or another tool instead of `nvim`.
- A pane is inside `tmux`, so the foreground process visible to `ps` is `tmux` rather than `nvim`.
- WezTerm returns panes without a usable `tty_name` or cwd.

## Success Criteria

**How will we know when we're done?**

- Selecting a project with an existing matching WezTerm pane activates that pane instead of opening a new tab.
- Matching requires both an exact normalized project path match and a foreground process whose basename is `nvim`.
- Selecting a project with no matching pane still opens a new WezTerm tab running `nvim` in the selected project path.
- The launcher continues surfacing clear errors when WezTerm is unavailable or launch commands fail.
- The new matching logic is covered with unit tests for exact matches, non-matches, and fallback spawning.

## Constraints & Assumptions

**What limitations do we need to work within?**

- The extension currently supports only WezTerm, so the enhancement can depend on `wezterm cli list` and `wezterm cli activate-pane`.
- Pane matching should use the exact project path rather than prefix or parent-directory heuristics.
- Foreground-process detection should use the pane `tty_name` from WezTerm and `ps -t <tty>` on macOS.
- If multiple panes match, the implementation should pick the first exact match returned by `wezterm cli list`.
- If activating a pane does not bring WezTerm to the foreground, that behavior can be revisited later; v1 only needs to invoke WezTerm pane activation.

## Questions & Open Items

**What do we still need to clarify?**

- Confirm during implementation whether `wezterm cli activate-pane` also brings the WezTerm GUI to the foreground in the target workflow.
- Assumption confirmed on 2026-03-29: the feature name is `focus-existing-neovim-pane`.
- Requirement clarified on 2026-03-29: a pane matches only when its cwd exactly equals the selected project path and its foreground process is `nvim`.
- Requirement clarified on 2026-03-29: when multiple panes match, the first pane returned by `wezterm cli list` wins.
