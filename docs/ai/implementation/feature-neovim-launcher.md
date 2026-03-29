---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Install dependencies with `npm install`.
- Run `npm run lint`, `npm test`, and `ray build --output dist --environment dist` to verify the extension locally.
- Use a local npm cache when invoking `npx ai-devkit` in this repository because the default user cache currently has permissions issues.

## Code Structure
**How is the code organized?**

- `src/launch-project.tsx` renders the Raycast list, handles loading state, and launches the selected project.
- `src/preferences.ts` resolves Raycast preferences into runtime defaults.
- `src/projects.ts` loads the JSON config file, normalizes project paths, and validates project entries.
- `src/terminals.ts` defines the terminal launcher contract and implements the WezTerm adapter.
- `src/utils/process.ts` wraps `execFile` and normalizes command execution failures for higher-level error handling.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Feature 1: Projects are loaded from a user-provided JSON file preference. The config supports either a top-level array or an object with a `projects` array.
- Feature 2: Relative project paths resolve from the config file directory, and `~/` paths resolve from the current user home directory.
- Feature 3: Launching uses `wezterm start --new-tab --cwd <path> -- <editor>` so an existing GUI instance opens a new tab in the active window.
- Feature 4: When no WezTerm GUI instance is available, the same `wezterm start` flow still starts WezTerm successfully, which results in the initial window for that session.
- Feature 5: The adapter no longer probes for running clients because the tab-oriented `wezterm start` flow already captures the required behavior.
- Feature 6: Terminal integration stays behind `TerminalLauncher`, so future backends can be added without changing the command UI contract.

### Patterns & Best Practices
- Keep command UI free of terminal-specific branching.
- Use early validation for config format and project path checks.
- Keep WezTerm argument builders pure so they are easy to unit test.
- Use structured process arguments instead of shell interpolation.

## Integration Points
**How do pieces connect?**

- Raycast preferences provide the config file path and any terminal-specific defaults.
- Node child-process APIs invoke the WezTerm CLI locally.
- The build uses the `ray` CLI bundled with `@raycast/api`.

## Error Handling
**How do we handle failures?**

- Missing config, malformed JSON, invalid project paths, missing `wezterm`, and unexpected WezTerm responses each map to explicit `ProjectConfigError` messages shown in Raycast toasts or empty states.

## Performance Considerations
**How do we keep it fast?**

- Parse config once per command load and avoid repeated filesystem work during list filtering.
- Only validate that a project path exists when the user launches that project.

## Security Notes
**What security measures are in place?**

- Avoid shell interpolation and use argument arrays for process execution.
- Restrict project launching to local filesystem paths configured by the user.
