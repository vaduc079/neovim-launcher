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

export interface TerminalLauncher {
  launchProject(request: LaunchProjectRequest): Promise<void>;
}

export type WezTermPaneRecord = {
  pane_id: number;
  cwd?: string;
  tty_name?: string;
  is_active?: boolean;
  title?: string;
};

export function createTerminalLauncher(
  weztermExecutable: string,
  commandRunner: CommandRunner = execFileRunner,
): TerminalLauncher {
  return new WezTermTerminalLauncher(weztermExecutable, commandRunner);
}

export function buildWezTermSpawnArgs(request: LaunchProjectRequest): string[] {
  return [
    "cli",
    "spawn",
    "--cwd",
    request.project.path,
    "--",
    request.editorCommand,
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

class WezTermTerminalLauncher implements TerminalLauncher {
  constructor(
    private readonly weztermExecutable: string,
    private readonly commandRunner: CommandRunner,
  ) {}

  async launchProject(request: LaunchProjectRequest): Promise<void> {
    try {
      await launchOrReuseWezTermPane(
        request,
        this.weztermExecutable,
        this.commandRunner,
      );

      await focusWezTermApp(this.commandRunner);
    } catch (error) {
      throw toWezTermLaunchError(error, this.weztermExecutable);
    }
  }
}

async function launchOrReuseWezTermPane(
  request: LaunchProjectRequest,
  weztermExecutable: string,
  commandRunner: CommandRunner,
): Promise<void> {
  const reusablePaneId = await findReusablePaneId(
    request,
    weztermExecutable,
    commandRunner,
  );

  if (reusablePaneId == null) {
    await commandRunner.execute(
      weztermExecutable,
      buildWezTermSpawnArgs(request),
    );
    return;
  }

  await commandRunner.execute(
    weztermExecutable,
    buildWezTermActivatePaneArgs(reusablePaneId),
  );
}

async function findReusablePaneId(
  request: LaunchProjectRequest,
  weztermExecutable: string,
  commandRunner: CommandRunner,
): Promise<number | undefined> {
  const paneList = await commandRunner.execute(
    weztermExecutable,
    buildWezTermListArgs(),
  );
  const panes = parseWezTermPaneList(paneList.stdout);
  const projectPath = request.project.path;
  const editorCommandBasename = path.basename(request.editorCommand.trim());

  return await findMatchingPaneId(
    panes,
    projectPath,
    editorCommandBasename,
    commandRunner,
  );
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

async function getForegroundCommandBasename(
  ttyName: string,
  commandRunner: CommandRunner,
): Promise<string | undefined> {
  const psTtyName = toPsTtyName(ttyName);
  if (psTtyName == null) return undefined;

  try {
    const result = await commandRunner.execute("ps", [
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

async function focusWezTermApp(commandRunner: CommandRunner): Promise<void> {
  try {
    await commandRunner.execute("open", buildMacOsActivateWezTermArgs());
  } catch {
    // Pane activation already succeeded; app activation is best-effort.
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

async function findMatchingPaneId(
  panes: WezTermPaneRecord[],
  projectPath: string,
  editorCommandBasename: string,
  commandRunner: CommandRunner,
): Promise<number | undefined> {
  for (const pane of panes) {
    const paneProjectPath = toPaneProjectPath(pane.cwd);
    if (paneProjectPath !== projectPath) {
      continue;
    }

    const foregroundCommandBasename = await getForegroundCommandBasename(
      pane.tty_name ?? "",
      commandRunner,
    );

    if (foregroundCommandBasename !== editorCommandBasename) continue;

    return pane.pane_id;
  }

  return undefined;
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
