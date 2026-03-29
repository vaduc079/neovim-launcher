import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CommandResult = {
  stdout: string;
  stderr: string;
};

export interface CommandRunner {
  execute(command: string, args: string[]): Promise<CommandResult>;
}

export class CommandExecutionError extends Error {
  constructor(
    readonly command: string,
    readonly args: string[],
    readonly exitCode: number | string | null,
    readonly stdout: string,
    readonly stderr: string,
    message?: string,
  ) {
    super(message ?? `Command failed: ${command}`);
    this.name = "CommandExecutionError";
  }
}

export const execFileRunner: CommandRunner = {
  async execute(command, args) {
    try {
      const result = await execFileAsync(command, args, {
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } catch (error) {
      throw createCommandExecutionError(command, args, error);
    }
  },
};

function createCommandExecutionError(
  command: string,
  args: string[],
  error: unknown,
): CommandExecutionError {
  if (isExecFileError(error)) {
    return new CommandExecutionError(
      command,
      args,
      error.code ?? null,
      error.stdout ?? "",
      error.stderr ?? "",
      error.message,
    );
  }

  return new CommandExecutionError(
    command,
    args,
    null,
    "",
    "",
    `Command failed: ${command}`,
  );
}

function isExecFileError(error: unknown): error is NodeJS.ErrnoException & {
  stdout?: string;
  stderr?: string;
  code?: number | string;
} {
  return error instanceof Error;
}
