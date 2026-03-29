import { LocalStorage } from "@raycast/api";

import {
  createManualProject,
  ManualProjectInput,
  mergeProjects,
  Project,
  ProjectError,
  ProjectSource,
  sortProjects,
} from "./projects";
import { ProjectDiscoveryResult } from "./project-discovery";

const discoveryStateStorageKey = "project-discovery-state";
const manualProjectsStorageKey = "manual-projects";

type StoredDiscoveryState = {
  searchRoots: string[];
  blacklistRoots: string[];
  detectedProjects: Project[];
  hasCompletedInitialDiscovery: boolean;
  lastRefreshedAt?: string;
};

export type ProjectCatalogState = {
  searchRoots: string[];
  blacklistRoots: string[];
  projects: Project[];
  hasCompletedInitialDiscovery: boolean;
  lastRefreshedAt?: string;
};

export async function getProjectCatalogState(): Promise<ProjectCatalogState> {
  const discoveryState = await readDiscoveryState();
  const manualProjects = await readManualProjects();
  const detectedProjects = discoveryState?.detectedProjects ?? [];
  const projects = mergeProjects(detectedProjects, manualProjects);

  return {
    searchRoots: discoveryState?.searchRoots ?? [],
    blacklistRoots: discoveryState?.blacklistRoots ?? [],
    projects,
    hasCompletedInitialDiscovery:
      discoveryState?.hasCompletedInitialDiscovery ?? false,
    lastRefreshedAt: discoveryState?.lastRefreshedAt,
  };
}

export async function saveDiscoveryResult(
  discoveryResult: ProjectDiscoveryResult,
): Promise<void> {
  const discoveryState: StoredDiscoveryState = {
    searchRoots: [...discoveryResult.searchRoots],
    blacklistRoots: [...discoveryResult.blacklistRoots],
    detectedProjects: sortProjects(discoveryResult.projects),
    hasCompletedInitialDiscovery: true,
    lastRefreshedAt: new Date().toISOString(),
  };

  await writeStorageValue(discoveryStateStorageKey, discoveryState);
}

export async function saveManualProject(
  manualProjectInput: ManualProjectInput,
): Promise<Project[]> {
  const manualProjects = await readManualProjects();
  const manualProject = createManualProject(manualProjectInput);
  const hasDuplicateManualProject = manualProjects.some(
    (project) => project.path === manualProject.path,
  );

  if (hasDuplicateManualProject) {
    throw new ProjectError(
      "Duplicate Project Path",
      `${manualProject.path} has already been added manually.`,
    );
  }

  const nextManualProjects = sortProjects([...manualProjects, manualProject]);
  await writeStorageValue(manualProjectsStorageKey, nextManualProjects);

  return nextManualProjects;
}

async function readDiscoveryState(): Promise<StoredDiscoveryState | undefined> {
  const rawValue = await LocalStorage.getItem<string>(discoveryStateStorageKey);
  if (rawValue == null) return undefined;

  const parsedValue = parseStoredJson(rawValue, "stored discovery state");
  if (!isRecord(parsedValue) || !Array.isArray(parsedValue.searchRoots)) {
    throw new ProjectError(
      "Stored Project Data Is Invalid",
      "The saved discovery state is not valid.",
    );
  }

  const searchRoots = parsedValue.searchRoots.map((searchRoot, index) =>
    readStoredString(searchRoot, `Search root ${index + 1}`),
  );
  const blacklistRoots = Array.isArray(parsedValue.blacklistRoots)
    ? parsedValue.blacklistRoots.map((blacklistRoot, index) =>
        readStoredString(blacklistRoot, `Blacklist folder ${index + 1}`),
      )
    : [];
  const detectedProjects = readStoredProjects(
    parsedValue.detectedProjects,
    "detected",
    "The saved discovery state is not valid.",
  );

  return {
    searchRoots,
    blacklistRoots,
    detectedProjects,
    hasCompletedInitialDiscovery:
      parsedValue.hasCompletedInitialDiscovery === true,
    lastRefreshedAt:
      typeof parsedValue.lastRefreshedAt === "string"
        ? parsedValue.lastRefreshedAt
        : undefined,
  };
}

async function readManualProjects(): Promise<Project[]> {
  const rawValue = await LocalStorage.getItem<string>(manualProjectsStorageKey);
  if (rawValue == null) return [];

  const parsedValue = parseStoredJson(rawValue, "stored manual projects");

  return readStoredProjects(
    parsedValue,
    "manual",
    "The saved manual project list is not valid.",
  );
}

function readStoredProjects(
  value: unknown,
  source: ProjectSource,
  invalidMessage: string,
): Project[] {
  if (!Array.isArray(value)) {
    throw new ProjectError("Stored Project Data Is Invalid", invalidMessage);
  }

  return value.map((project, index) => {
    if (!isRecord(project)) {
      throw new ProjectError(
        "Stored Project Data Is Invalid",
        `Stored project ${index + 1} is not valid.`,
      );
    }

    const name = readStoredString(project.name, `Project ${index + 1} name`);
    const projectPath = readStoredString(
      project.path,
      `Project ${index + 1} path`,
    );
    const description =
      typeof project.description === "string" ? project.description : undefined;

    return {
      name,
      path: projectPath,
      description,
      source,
    };
  });
}

function parseStoredJson(rawValue: string, label: string): unknown {
  try {
    return JSON.parse(rawValue);
  } catch {
    throw new ProjectError(
      "Stored Project Data Is Invalid",
      `The ${label} could not be parsed.`,
    );
  }
}

async function writeStorageValue(key: string, value: unknown): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

function readStoredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ProjectError(
      "Stored Project Data Is Invalid",
      `${label} is missing or invalid.`,
    );
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}
