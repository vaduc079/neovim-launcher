import { describe, expect, it, vi } from "vitest";

import { Project } from "./projects";
import { CommandExecutionError, CommandRunner } from "./utils/process";
import { buildWezTermStartArgs, createTerminalLauncher } from "./terminals";

const project: Project = {
  name: "Project",
  path: "/tmp/project",
  source: "detected",
};

describe("wezterm argument builders", () => {
  it("builds the cli spawn arguments for the WezTerm launch flow", () => {
    expect(
      buildWezTermStartArgs({
        project,
        editorCommand: "nvim",
      }),
    ).toEqual(["cli", "spawn", "--cwd", "/tmp/project", "--", "nvim"]);
  });
});

describe("createTerminalLauncher", () => {
  it("uses the cli spawn command to launch projects", async () => {
    const commandRunner = createCommandRunner([{ stdout: "", stderr: "" }]);
    const launcher = createTerminalLauncher("wezterm", commandRunner);

    await launcher.launchProject({
      project,
      editorCommand: "nvim",
    });

    expect(commandRunner.execute).toHaveBeenCalledTimes(1);
    expect(commandRunner.execute).toHaveBeenNthCalledWith(1, "wezterm", [
      "cli",
      "spawn",
      "--cwd",
      "/tmp/project",
      "--",
      "nvim",
    ]);
  });

  it("surfaces a clear error when WezTerm is missing", async () => {
    const commandRunner = createCommandRunner([
      createCommandError("spawn wezterm ENOENT", "ENOENT"),
    ]);
    const launcher = createTerminalLauncher("wezterm", commandRunner);

    await expect(
      launcher.launchProject({
        project,
        editorCommand: "nvim",
      }),
    ).rejects.toMatchObject({
      title: "WezTerm Not Found",
    });
  });
});

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

function createCommandError(
  message: string,
  code = "EPERM",
): CommandExecutionError {
  return new CommandExecutionError(
    "wezterm",
    ["cli"],
    code,
    "",
    message,
    message,
  );
}
