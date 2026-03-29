import { Project, ProjectConfigError } from "./projects";
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

export function createTerminalLauncher(
  weztermExecutable: string,
  commandRunner: CommandRunner = execFileRunner,
): TerminalLauncher {
  return new WezTermLauncher(weztermExecutable, commandRunner);
}

export function buildWezTermStartArgs(request: LaunchProjectRequest): string[] {
  return [
    "cli",
    "spawn",
    "--cwd",
    request.project.path,
    "--",
    request.editorCommand,
  ];
}

class WezTermLauncher implements TerminalLauncher {
  constructor(
    private readonly weztermExecutable: string,
    private readonly commandRunner: CommandRunner,
  ) {}

  async launchProject(request: LaunchProjectRequest): Promise<void> {
    const args = buildWezTermStartArgs(request);

    try {
      await this.commandRunner.execute(this.weztermExecutable, args);
    } catch (error) {
      throw toWezTermLaunchError(error, this.weztermExecutable);
    }
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

  if (error instanceof ProjectConfigError) {
    return error;
  }

  if (error instanceof CommandExecutionError) {
    return new ProjectConfigError(
      "WezTerm Launch Failed",
      error.stderr.trim() ||
        error.stdout.trim() ||
        `WezTerm failed while running ${weztermExecutable}.`,
    );
  }

  return new ProjectConfigError(
    "WezTerm Launch Failed",
    `WezTerm failed while running ${weztermExecutable}.`,
  );
}

function createMissingWezTermError(
  weztermExecutable: string,
): ProjectConfigError {
  return new ProjectConfigError(
    "WezTerm Not Found",
    `Raycast could not find the WezTerm executable at ${weztermExecutable}.`,
  );
}
