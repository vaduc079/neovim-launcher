import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeDirectoryPath, Project, ProjectError } from "./projects";
import {
  CommandExecutionError,
  CommandRunner,
  execFileRunner,
} from "./utils/process";

export type LaunchProjectRequest = {
  project: Project;
  editorCommand: string;
};

export type WezTermPaneRecord = {
  pane_id: number;
  cwd?: string;
  tty_name?: string;
  is_active?: boolean;
  title?: string;
};

export function buildWezTermSpawnArgs(request: LaunchProjectRequest): string[] {
  const shellLaunchConfig = resolveShellLaunchConfig();
  const shellCommand = buildShellLaunchCommand(request.editorCommand);

  return [
    "cli",
    "spawn",
    "--cwd",
    request.project.path,
    "--",
    shellLaunchConfig.executable,
    ...shellLaunchConfig.args,
    shellCommand,
  ];
}

export function buildWezTermListArgs(): string[] {
  return ["cli", "list", "--format", "json"];
}

export function buildWezTermActivatePaneArgs(paneId: number): string[] {
  return ["cli", "activate-pane", "--pane-id", String(paneId)];
}

export function buildMacOsActivateWezTermArgs(): string[] {
  return ["-a", "WezTerm"];
}

type ShellLaunchConfig = {
  executable: string;
  args: string[];
};

function resolveShellLaunchConfig(): ShellLaunchConfig {
  const configuredShell = process.env.SHELL?.trim();
  const executable =
    configuredShell && configuredShell !== "" ? configuredShell : "/bin/zsh";
  const shellName = path.basename(executable);

  if (shellName === "zsh" || shellName === "bash") {
    return {
      executable,
      args: ["-lic"],
    };
  }

  return {
    executable,
    args: ["-c"],
  };
}

function buildShellLaunchCommand(editorCommand: string): string {
  return `exec ${quoteShellWord(editorCommand.trim())}`;
}

function quoteShellWord(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export class WezTermLauncher {
  constructor(
    private readonly weztermExecutable: string,
    private readonly commandRunner: CommandRunner = execFileRunner,
  ) {}

  async launchProject(request: LaunchProjectRequest): Promise<void> {
    try {
      await this.launchOrReusePane(request);
      await this.focusApp();
    } catch (error) {
      throw toWezTermLaunchError(error, this.weztermExecutable);
    }
  }

  private async launchOrReusePane(
    request: LaunchProjectRequest,
  ): Promise<void> {
    const reusablePaneId = await this.findReusablePaneId(request);

    if (reusablePaneId == null) {
      await this.commandRunner.execute(
        this.weztermExecutable,
        buildWezTermSpawnArgs(request),
      );
      return;
    }

    await this.commandRunner.execute(
      this.weztermExecutable,
      buildWezTermActivatePaneArgs(reusablePaneId),
    );
  }

  private async findReusablePaneId(
    request: LaunchProjectRequest,
  ): Promise<number | undefined> {
    const paneList = await this.commandRunner.execute(
      this.weztermExecutable,
      buildWezTermListArgs(),
    );
    const panes = parseWezTermPaneList(paneList.stdout);
    const projectPath = request.project.path;
    const editorCommandBasename = path.basename(request.editorCommand.trim());

    for (const pane of panes) {
      const paneProjectPath = toPaneProjectPath(pane.cwd);
      if (paneProjectPath !== projectPath) {
        continue;
      }

      const foregroundCommandBasename = await this.getForegroundCommandBasename(
        pane.tty_name ?? "",
      );

      if (foregroundCommandBasename !== editorCommandBasename) {
        continue;
      }

      return pane.pane_id;
    }

    return undefined;
  }

  private async getForegroundCommandBasename(
    ttyName: string,
  ): Promise<string | undefined> {
    const psTtyName = toPsTtyName(ttyName);
    if (psTtyName == null) return undefined;

    try {
      const result = await this.commandRunner.execute("ps", [
        "-t",
        psTtyName,
        "-o",
        "state=",
        "-o",
        "comm=",
      ]);

      return parseForegroundCommandBasename(result.stdout);
    } catch {
      return undefined;
    }
  }

  private async focusApp(): Promise<void> {
    try {
      await this.commandRunner.execute("open", buildMacOsActivateWezTermArgs());
    } catch {
      // Pane activation already succeeded; app activation is best-effort.
    }
  }
}

export function parseWezTermPaneList(stdout: string): WezTermPaneRecord[] {
  try {
    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed)) return [];

    const panes: WezTermPaneRecord[] = [];

    for (const value of parsed) {
      const pane = parseWezTermPaneRecord(value);
      if (pane == null) continue;

      panes.push(pane);
    }

    return panes;
  } catch {
    return [];
  }
}

function isMissingExecutableError(
  error: unknown,
): error is CommandExecutionError {
  return error instanceof CommandExecutionError && error.exitCode === "ENOENT";
}

function toWezTermLaunchError(
  error: unknown,
  weztermExecutable: string,
): Error {
  if (isMissingExecutableError(error)) {
    return createMissingWezTermError(weztermExecutable);
  }

  if (error instanceof ProjectError) {
    return error;
  }

  if (error instanceof CommandExecutionError) {
    return new ProjectError(
      "WezTerm Launch Failed",
      error.stderr.trim() ||
        error.stdout.trim() ||
        `WezTerm failed while running ${weztermExecutable}.`,
    );
  }

  return new ProjectError(
    "WezTerm Launch Failed",
    `WezTerm failed while running ${weztermExecutable}.`,
  );
}

function createMissingWezTermError(weztermExecutable: string): ProjectError {
  return new ProjectError(
    "WezTerm Not Found",
    `Raycast could not find the WezTerm executable at ${weztermExecutable}.`,
  );
}

function parseWezTermPaneRecord(value: unknown): WezTermPaneRecord | undefined {
  if (!isObject(value)) return undefined;
  if (typeof value.pane_id !== "number") return undefined;

  return {
    pane_id: value.pane_id,
    cwd: readOptionalString(value.cwd),
    tty_name: readOptionalString(value.tty_name),
    is_active:
      typeof value.is_active === "boolean" ? value.is_active : undefined,
    title: readOptionalString(value.title),
  };
}

function toPaneProjectPath(cwd: string | undefined): string | undefined {
  if (typeof cwd !== "string" || cwd.trim() === "") {
    return undefined;
  }

  const rawCwd = cwd.trim();
  const pathLikeValue = rawCwd.startsWith("file:")
    ? fileURLToPath(rawCwd)
    : rawCwd;

  try {
    return normalizeDirectoryPath(pathLikeValue, "Pane cwd");
  } catch {
    return undefined;
  }
}

function toPsTtyName(ttyName: string): string | undefined {
  const trimmedTtyName = ttyName.trim();
  if (trimmedTtyName === "") return undefined;

  return path.basename(trimmedTtyName);
}

function parseForegroundCommandBasename(stdout: string): string | undefined {
  const outputLines = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  for (const line of outputLines) {
    const parts = line.match(/^(\S+)\s+(.+)$/u);
    if (parts == null) continue;

    const [, state, command] = parts;
    const isForegroundProcess = state.includes("+");

    if (!isForegroundProcess) {
      continue;
    }

    return path.basename(command.trim());
  }

  return undefined;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}
