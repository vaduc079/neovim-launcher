---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Developers using Raycast, Neovim, and WezTerm need a fast way to jump into a known project and start editing without manually opening a terminal, changing directories, and launching `nvim`.
- The target user is a single-machine local developer workflow on macOS, with the initial audience being the author of this extension and similar keyboard-driven users.
- The current workaround is manual terminal interaction or maintaining separate terminal shortcuts per project, which adds friction and does not scale well across many repositories.

## Goals & Objectives
**What do we want to achieve?**

- Provide one Raycast command that shows a selectable list of configured projects.
- When a project is selected, open that project in Neovim inside WezTerm.
- Reuse an existing WezTerm GUI instance when possible instead of launching a separate terminal application process for every invocation.
- Open the selected project in a new WezTerm tab, not a pane or separate window.
- Structure terminal integration so additional terminal backends can be added later without rewriting command-level logic.

- Non-goals:
- Support multiple command-per-project launchers in the initial version.
- Support terminals other than WezTerm in the initial version.
- Manage project discovery automatically from the filesystem, Git hosting APIs, or editor session history in the initial version.
- Support remote environments, SSH targets, or tmux integration in the initial version.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a Raycast user, I want to invoke one launcher command and choose a project from a list so that I can start editing quickly.
- As a WezTerm user, I want the launcher to reuse my existing terminal app instance when one is already running so that I do not accumulate duplicate app launches.
- As a Neovim user, I want the launched terminal tab to start in the selected project directory and run `nvim` immediately so that I can work without extra shell steps.
- As a future maintainer, I want terminal-specific behavior isolated behind a clear interface so that I can add support for terminals beyond WezTerm with minimal command changes.

- Key workflow:
- User opens the Raycast command.
- User sees configured projects in a list and selects one.
- Extension validates the project path and invokes the WezTerm launcher.
- WezTerm opens a new tab in the active window when possible, or starts WezTerm normally when no GUI instance exists, and runs `nvim`.

- Edge cases:
- Configured project path does not exist.
- WezTerm CLI is unavailable on the machine.
- No WezTerm GUI instance is currently running.
- Project configuration is malformed or empty.

## Success Criteria
**How will we know when we're done?**

- The command renders a list of configured projects in Raycast.
- Selecting a project successfully launches `nvim` in a new WezTerm tab rooted at the configured directory when WezTerm is already running.
- If no WezTerm GUI instance is running, the launcher still starts WezTerm successfully and opens the project there.
- If WezTerm is already running, the launcher uses WezTerm CLI integration rather than opening a separate terminal application family.
- Invalid configuration or launch failures are surfaced with actionable Raycast feedback.
- The codebase has a terminal abstraction that makes a second backend feasible without changing the project-selection command contract.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Initial platform target is macOS because Raycast is macOS-first and the user explicitly asked for WezTerm support on their machine.
- The repository currently has no commits, so Git worktree-based isolation is not available until an initial commit exists. Phase work will proceed in the current repository as a practical fallback.
- The extension should avoid spawning arbitrary shell strings where structured process arguments are sufficient.
- Project configuration must be user-editable without code changes; the first version will need a simple configuration source that Raycast can access locally.
- The design should prefer deterministic terminal commands that can be tested with mocks.

## Questions & Open Items
**What do we still need to clarify?**

- What is the best configuration UX for project definitions in v1: a JSON file preference, multiple text preferences, or another Raycast-supported preference pattern?
- Requirement update on 2026-03-28: prefer a new WezTerm tab over a new window because the target workflow uses terminal multiplexing.
- If no WezTerm GUI instance is running, is opening the initial window acceptable for v1 since there is no existing tab host?
- Should the window title be customized to the project name in v1, or is the default terminal title sufficient?
