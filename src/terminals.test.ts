import { pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { Project } from "./projects";
import { CommandExecutionError, CommandRunner } from "./utils/process";
import {
  buildMacOsActivateWezTermArgs,
  buildWezTermActivatePaneArgs,
  buildWezTermListArgs,
  buildWezTermSpawnArgs,
  WezTermLauncher,
} from "./terminals";

const project: Project = {
  name: "Project",
  path: "/tmp/project",
  source: "detected",
};

describe("wezterm argument builders", () => {
  it("builds the cli spawn arguments for the WezTerm launch flow", () => {
    const shellArgs =
      (process.env.SHELL ?? "/bin/zsh").endsWith("zsh") ||
      (process.env.SHELL ?? "/bin/zsh").endsWith("bash")
        ? ["-lic"]
        : ["-c"];

    expect(
      buildWezTermSpawnArgs({
        project,
        editorCommand: "nvim",
      }),
    ).toEqual([
      "cli",
      "spawn",
      "--cwd",
      "/tmp/project",
      "--",
      process.env.SHELL ?? "/bin/zsh",
      ...shellArgs,
      "exec 'nvim'",
    ]);
  });

  it("quotes editor commands before passing them to the login shell", () => {
    const shellArgs =
      (process.env.SHELL ?? "/bin/zsh").endsWith("zsh") ||
      (process.env.SHELL ?? "/bin/zsh").endsWith("bash")
        ? ["-lic"]
        : ["-c"];

    expect(
      buildWezTermSpawnArgs({
        project,
        editorCommand: "/Applications/Neovim Nightly.app/Contents/MacOS/nvim",
      }),
    ).toEqual([
      "cli",
      "spawn",
      "--cwd",
      "/tmp/project",
      "--",
      process.env.SHELL ?? "/bin/zsh",
      ...shellArgs,
      "exec '/Applications/Neovim Nightly.app/Contents/MacOS/nvim'",
    ]);
  });

  it("builds the cli list arguments for pane inspection", () => {
    expect(buildWezTermListArgs()).toEqual(["cli", "list", "--format", "json"]);
  });

  it("builds the cli activate-pane arguments for focusing a match", () => {
    expect(buildWezTermActivatePaneArgs(42)).toEqual([
      "cli",
      "activate-pane",
      "--pane-id",
      "42",
    ]);
  });

  it("builds the macOS app activation arguments for bringing WezTerm forward", () => {
    expect(buildMacOsActivateWezTermArgs()).toEqual(["-a", "WezTerm"]);
  });
});

describe("WezTermLauncher", () => {
  const shellArgs =
    (process.env.SHELL ?? "/bin/zsh").endsWith("zsh") ||
    (process.env.SHELL ?? "/bin/zsh").endsWith("bash")
      ? ["-lic"]
      : ["-c"];

  it("activates an existing pane when cwd and foreground nvim both match", async () => {
    const commandRunner = createCommandRunner([
      {
        stdout: createPaneListOutput([
          { pane_id: 87, cwd: project.path, tty_name: "/dev/ttys002" },
        ]),
        stderr: "",
      },
      { stdout: "Ss   -zsh\nS+   nvim\n", stderr: "" },
      { stdout: "", stderr: "" },
      { stdout: "", stderr: "" },
    ]);
    await launchProject(commandRunner);

    expect(commandRunner.execute).toHaveBeenCalledTimes(4);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(1, "wezterm", [
      "cli",
      "list",
      "--format",
      "json",
    ]);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(2, "ps", [
      "-t",
      "ttys002",
      "-o",
      "state=",
      "-o",
      "comm=",
    ]);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(3, "wezterm", [
      "cli",
      "activate-pane",
      "--pane-id",
      "87",
    ]);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(4, "open", [
      "-a",
      "WezTerm",
    ]);
  });

  it("falls back to spawning when the matching pane is not running nvim", async () => {
    const commandRunner = createCommandRunner([
      {
        stdout: createPaneListOutput([
          { pane_id: 87, cwd: project.path, tty_name: "/dev/ttys002" },
        ]),
        stderr: "",
      },
      { stdout: "Ss   -zsh\nS+   codex\n", stderr: "" },
      { stdout: "", stderr: "" },
      { stdout: "", stderr: "" },
    ]);
    await launchProject(commandRunner);

    expect(commandRunner.execute).toHaveBeenCalledTimes(4);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(3, "wezterm", [
      "cli",
      "spawn",
      "--cwd",
      "/tmp/project",
      "--",
      process.env.SHELL ?? "/bin/zsh",
      ...shellArgs,
      "exec 'nvim'",
    ]);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(4, "open", [
      "-a",
      "WezTerm",
    ]);
  });

  it("falls back to spawning when a pane is missing tty metadata", async () => {
    const commandRunner = createCommandRunner([
      {
        stdout: createPaneListOutput([{ pane_id: 87, cwd: project.path }]),
        stderr: "",
      },
      { stdout: "", stderr: "" },
      { stdout: "", stderr: "" },
    ]);
    await launchProject(commandRunner);

    expect(commandRunner.execute).toHaveBeenCalledTimes(3);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(2, "wezterm", [
      "cli",
      "spawn",
      "--cwd",
      "/tmp/project",
      "--",
      process.env.SHELL ?? "/bin/zsh",
      ...shellArgs,
      "exec 'nvim'",
    ]);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(3, "open", [
      "-a",
      "WezTerm",
    ]);
  });

  it("uses the first matching pane returned by wezterm cli list", async () => {
    const commandRunner = createCommandRunner([
      {
        stdout: createPaneListOutput([
          { pane_id: 87, cwd: project.path, tty_name: "/dev/ttys002" },
          { pane_id: 99, cwd: project.path, tty_name: "/dev/ttys003" },
        ]),
        stderr: "",
      },
      { stdout: "Ss   -zsh\nS+   nvim\n", stderr: "" },
      { stdout: "", stderr: "" },
      { stdout: "", stderr: "" },
    ]);
    await launchProject(commandRunner);

    expect(commandRunner.execute).toHaveBeenCalledTimes(4);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(2, "ps", [
      "-t",
      "ttys002",
      "-o",
      "state=",
      "-o",
      "comm=",
    ]);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(3, "wezterm", [
      "cli",
      "activate-pane",
      "--pane-id",
      "87",
    ]);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(4, "open", [
      "-a",
      "WezTerm",
    ]);
  });

  it("does not fail the launch when app activation is unavailable", async () => {
    const commandRunner = createCommandRunner([
      {
        stdout: createPaneListOutput([
          { pane_id: 87, cwd: project.path, tty_name: "/dev/ttys002" },
        ]),
        stderr: "",
      },
      { stdout: "Ss   -zsh\nS+   nvim\n", stderr: "" },
      { stdout: "", stderr: "" },
      createCommandError("open", "open WezTerm failed"),
    ]);

    await expect(launchProject(commandRunner)).resolves.toBeUndefined();
  });

  it("falls back to spawning when wezterm pane data cannot be parsed", async () => {
    const commandRunner = createCommandRunner([
      { stdout: "{not-json", stderr: "" },
      { stdout: "", stderr: "" },
      { stdout: "", stderr: "" },
    ]);

    await launchProject(commandRunner);

    expect(commandRunner.execute).toHaveBeenCalledTimes(3);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(2, "wezterm", [
      "cli",
      "spawn",
      "--cwd",
      "/tmp/project",
      "--",
      process.env.SHELL ?? "/bin/zsh",
      ...shellArgs,
      "exec 'nvim'",
    ]);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(3, "open", [
      "-a",
      "WezTerm",
    ]);
  });

  it("does not fail the spawn flow when app activation is unavailable", async () => {
    const commandRunner = createCommandRunner([
      { stdout: "{not-json", stderr: "" },
      { stdout: "", stderr: "" },
      createCommandError("open", "open WezTerm failed"),
    ]);

    await expect(launchProject(commandRunner)).resolves.toBeUndefined();
  });

  it("surfaces a clear error when WezTerm is missing", async () => {
    const commandRunner = createCommandRunner([
      createCommandError("wezterm", "spawn wezterm ENOENT", "ENOENT"),
    ]);

    await expect(launchProject(commandRunner)).rejects.toMatchObject({
      title: "WezTerm Not Found",
    });
  });
});

async function launchProject(commandRunner: CommandRunner): Promise<void> {
  const launcher = new WezTermLauncher("wezterm", commandRunner);

  await launcher.launchProject({
    project,
    editorCommand: "nvim",
  });
}

function createCommandRunner(
  results: Array<{ stdout: string; stderr: string } | Error>,
): CommandRunner & {
  execute: ReturnType<typeof vi.fn>;
} {
  const execute = vi.fn(async () => {
    const nextResult = results.shift();

    if (nextResult == null) {
      throw new Error("No more mocked command results were provided.");
    }

    if (nextResult instanceof Error) {
      throw nextResult;
    }

    return nextResult;
  });

  return { execute };
}

function createPaneListOutput(
  panes: Array<{ pane_id: number; cwd?: string; tty_name?: string }>,
): string {
  return JSON.stringify(
    panes.map((pane) => ({
      ...pane,
      cwd: pane.cwd == null ? undefined : pathToFileURL(pane.cwd).toString(),
    })),
  );
}

function createCommandError(
  command: string,
  message: string,
  code = "EPERM",
): CommandExecutionError {
  return new CommandExecutionError(
    command,
    ["cli"],
    code,
    "",
    message,
    message,
  );
}
