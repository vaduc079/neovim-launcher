import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export type ProjectSource = "detected" | "manual";

export type Project = {
  name: string;
  path: string;
  description?: string;
  source: ProjectSource;
};

export type ManualProjectInput = {
  name: string;
  path: string;
  description?: string;
};

export class ProjectError extends Error {
  constructor(
    readonly title: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

export async function ensureProjectDirectory(project: Project): Promise<void> {
  let stats;

  try {
    stats = await fs.stat(project.path);
  } catch (error) {
    throw createMissingProjectError(project, error);
  }

  if (!stats.isDirectory()) {
    throw new ProjectError(
      "Project Path Is Not a Directory",
      `${project.name} points to ${project.path}, but that path is not a directory.`,
    );
  }
}

export function createDetectedProject(projectPath: string): Project {
  const normalizedPath = normalizeDirectoryPath(projectPath, "Project Path");

  return {
    name: path.basename(normalizedPath),
    path: normalizedPath,
    source: "detected",
  };
}

export function createManualProject(input: ManualProjectInput): Project {
  const name = readNonEmptyString(input.name, "Project name");
  const projectPath = normalizeDirectoryPath(input.path, "Project path");
  const description = readOptionalString(
    input.description,
    "Project description",
  );

  return {
    name,
    path: projectPath,
    description,
    source: "manual",
  };
}

export function mergeProjects(
  detectedProjects: Project[],
  manualProjects: Project[],
): Project[] {
  const mergedProjects = new Map<string, Project>();

  for (const project of sortProjects(detectedProjects)) {
    mergedProjects.set(project.path, project);
  }

  for (const project of sortProjects(manualProjects)) {
    mergedProjects.set(project.path, project);
  }

  return sortProjects([...mergedProjects.values()]);
}

export function normalizeDirectoryPath(value: string, label: string): string {
  const trimmedValue = readNonEmptyString(value, label);
  const expandedPath = expandHome(trimmedValue);

  if (!path.isAbsolute(expandedPath)) {
    throw new ProjectError(
      "Invalid Path",
      `${label} must be an absolute path or start with ~/.`,
    );
  }

  return path.normalize(expandedPath);
}

export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((left, right) => {
    const nameComparison = left.name.localeCompare(right.name);
    if (nameComparison !== 0) return nameComparison;

    return left.path.localeCompare(right.path);
  });
}

export function toProjectError(error: unknown): ProjectError {
  if (error instanceof ProjectError) {
    return error;
  }

  return new ProjectError(
    "Project Error",
    error instanceof Error ? error.message : "Unknown error.",
  );
}

function readNonEmptyString(value: string | undefined, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ProjectError("Missing Required Field", `${label} is required.`);
  }

  return value.trim();
}

function readOptionalString(
  value: string | undefined,
  label: string,
): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") {
    throw new ProjectError("Invalid Project", `${label} must be a string.`);
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
}

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (!value.startsWith("~/")) return value;

  return path.join(os.homedir(), value.slice(2));
}

function createMissingProjectError(
  project: Project,
  error: unknown,
): ProjectError {
  const isMissingFile = isNodeError(error) && error.code === "ENOENT";

  if (isMissingFile) {
    return new ProjectError(
      "Project Path Not Found",
      `${project.name} points to ${project.path}, but that path does not exist.`,
    );
  }

  return new ProjectError(
    "Unable To Read Project Path",
    `Raycast could not access ${project.path}.`,
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
