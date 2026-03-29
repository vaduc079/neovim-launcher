import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export type Project = {
  id: string;
  name: string;
  path: string;
  description?: string;
};

type ProjectInput = {
  name: string;
  path: string;
  description?: string;
};

type ProjectConfigFile = ProjectInput[] | { projects: ProjectInput[] };

export class ProjectConfigError extends Error {
  constructor(
    readonly title: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectConfigError";
  }
}

export async function loadProjects(
  projectConfigFile: string,
): Promise<Project[]> {
  const resolvedConfigFile = expandHome(projectConfigFile);
  const configDirectory = path.dirname(resolvedConfigFile);

  let rawConfig: string;

  try {
    rawConfig = await fs.readFile(resolvedConfigFile, "utf8");
  } catch (error) {
    throw createReadError(resolvedConfigFile, error);
  }

  return parseProjectConfig(rawConfig, configDirectory);
}

export async function ensureProjectDirectory(project: Project): Promise<void> {
  let stats;

  try {
    stats = await fs.stat(project.path);
  } catch (error) {
    throw createMissingProjectError(project, error);
  }

  if (!stats.isDirectory()) {
    throw new ProjectConfigError(
      "Project Path Is Not a Directory",
      `${project.name} points to ${project.path}, but that path is not a directory.`,
    );
  }
}

export function parseProjectConfig(
  rawConfig: string,
  configDirectory: string,
): Project[] {
  let parsedConfig: unknown;

  try {
    parsedConfig = JSON.parse(rawConfig) as ProjectConfigFile;
  } catch {
    throw new ProjectConfigError(
      "Invalid Project Config",
      "The project config file does not contain valid JSON.",
    );
  }

  const projectInputs = extractProjectInputs(parsedConfig);
  const normalizedProjects = projectInputs.map((project, index) =>
    normalizeProject(project, configDirectory, index),
  );

  ensureUniqueProjectIds(normalizedProjects);

  return normalizedProjects.sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function extractProjectInputs(parsedConfig: unknown): ProjectInput[] {
  if (Array.isArray(parsedConfig)) return parsedConfig as ProjectInput[];

  if (isRecord(parsedConfig) && Array.isArray(parsedConfig.projects)) {
    return parsedConfig.projects as ProjectInput[];
  }

  throw new ProjectConfigError(
    "Invalid Project Config",
    "The project config file must be a JSON array or an object with a projects array.",
  );
}

function normalizeProject(
  project: unknown,
  configDirectory: string,
  index: number,
): Project {
  if (!isRecord(project)) {
    throw new ProjectConfigError(
      "Invalid Project Config",
      `Project entry ${index + 1} must be an object with name and path fields.`,
    );
  }

  const name = readNonEmptyString(
    project.name,
    `Project entry ${index + 1} is missing a valid name.`,
  );
  const projectPath = readNonEmptyString(
    project.path,
    `Project ${name} is missing a valid path.`,
  );
  const description = readOptionalString(
    project.description,
    `Project ${name} has an invalid description.`,
  );
  const resolvedPath = resolveProjectPath(projectPath, configDirectory);

  return {
    id: resolvedPath,
    name,
    path: resolvedPath,
    description,
  };
}

function readNonEmptyString(value: unknown, errorMessage: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ProjectConfigError("Invalid Project Config", errorMessage);
  }

  return value.trim();
}

function readOptionalString(
  value: unknown,
  errorMessage: string,
): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") {
    throw new ProjectConfigError("Invalid Project Config", errorMessage);
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
}

function resolveProjectPath(
  projectPath: string,
  configDirectory: string,
): string {
  const expandedPath = expandHome(projectPath);
  if (path.isAbsolute(expandedPath)) return path.normalize(expandedPath);

  return path.resolve(configDirectory, expandedPath);
}

function ensureUniqueProjectIds(projects: Project[]): void {
  const seenPaths = new Set<string>();

  for (const project of projects) {
    if (!seenPaths.has(project.id)) {
      seenPaths.add(project.id);
      continue;
    }

    throw new ProjectConfigError(
      "Duplicate Project Path",
      `The config file contains duplicate project paths for ${project.path}.`,
    );
  }
}

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (!value.startsWith("~/")) return value;

  return path.join(os.homedir(), value.slice(2));
}

function createReadError(
  projectConfigFile: string,
  error: unknown,
): ProjectConfigError {
  const isMissingFile = isNodeError(error) && error.code === "ENOENT";

  if (isMissingFile) {
    return new ProjectConfigError(
      "Project Config File Not Found",
      `Raycast is pointing to ${projectConfigFile}, but that file does not exist.`,
    );
  }

  return new ProjectConfigError(
    "Unable To Read Project Config",
    `Raycast could not read ${projectConfigFile}.`,
  );
}

function createMissingProjectError(
  project: Project,
  error: unknown,
): ProjectConfigError {
  const isMissingFile = isNodeError(error) && error.code === "ENOENT";

  if (isMissingFile) {
    return new ProjectConfigError(
      "Project Path Not Found",
      `${project.name} points to ${project.path}, but that path does not exist.`,
    );
  }

  return new ProjectConfigError(
    "Unable To Read Project Path",
    `Raycast could not access ${project.path}.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
