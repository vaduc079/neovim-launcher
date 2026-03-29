---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target is 100% for new project-parsing and terminal-command-building modules.
- Integration coverage should focus on command-layer orchestration with mocked process execution.
- Manual coverage is required for the Raycast-to-WezTerm launch path.

## Verification Summary
**What has already been verified?**

- `npm test` passes with 7 unit tests covering config parsing and WezTerm launch selection.
- `npm run lint` passes, including package validation, icon validation, ESLint, and Prettier checks.
- `ray build --output dist --environment dist` succeeds.

## Unit Tests
**What individual components need testing?**

### Project Config Loader
- [x] Test case 1: Parses valid JSON config into normalized project objects.
- [x] Test case 2: Rejects malformed JSON or invalid schema.
- [x] Additional coverage: duplicate project paths and relative path resolution.

### WezTerm Launcher
- [x] Test case 1: Builds the expected `wezterm start --new-tab --cwd ... -- nvim` invocation.
- [x] Test case 2: Surfaces a clear error when the CLI invocation fails.
- [x] Additional coverage: the launcher uses a single tab-oriented WezTerm start path instead of branching on client detection.

## Integration Tests
**How do we test component interactions?**

- [ ] Integration scenario 1: Command loads valid projects and exposes launch actions.
- [ ] Integration scenario 2: Invalid config renders actionable empty/error state guidance.
- [ ] Integration scenario 3: Launch action passes the selected project into the terminal service.
These remain manual or future test-harness work because Raycast UI components are not exercised in the current unit suite.

## End-to-End Tests
**What user flows need validation?**

- [ ] User flow 1: Choose a valid project and open it in a new WezTerm tab running `nvim`.
- [ ] User flow 2: Open the command with a missing config file and confirm the user can reach preferences and recover.
These are still pending manual Raycast verification.

## Test Data
**What data do we use for testing?**

- JSON fixture files for valid and invalid project configs.
- Mock process runner responses for WezTerm success and failure cases.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Prefer project test scripts that can be run locally in CI-style mode.
- Current verification commands:
- `npm test`
- `npm run lint`
- `ray build --output dist --environment dist`
- Raycast UI interactions remain the main coverage gap.

## Manual Testing
**What requires human validation?**

- Confirm Raycast list UX and action labels.
- Confirm WezTerm opens a new tab in the active window, not a pane or separate window, when a GUI instance is already running.
- Confirm the launcher still opens WezTerm successfully when no GUI instance is running yet.
- Confirm `nvim` starts in the expected project directory.
- Confirm the extension preferences allow the user to recover quickly from a missing or malformed config file.

## Performance Testing
**How do we validate performance?**

- Manual check that the list opens without noticeable delay for a moderate project set.

## Bug Tracking
**How do we manage issues?**

- Track launch failures separately for config parsing, filesystem validation, and terminal invocation so regressions are easy to isolate.
