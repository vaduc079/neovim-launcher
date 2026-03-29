import { execFile } from "node:child_process";
import { Dirent, promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import {
  createDetectedProject,
  normalizeDirectoryPath,
  Project,
  ProjectError,
  sortProjects,
} from "./projects";

const execFileAsync = promisify(execFile);
const gitProjectKindArgs = [
  "rev-parse",
  "--path-format=absolute",
  "--show-toplevel",
  "--git-dir",
  "--git-common-dir",
];

export type ProjectDiscoveryResult = {
  searchRoots: string[];
  blacklistRoots: string[];
  projects: Project[];
};

export type ProjectDiscoveryInput = {
  searchRoots: string[];
  blacklistRoots: string[];
};

type GitMetadataPaths = {
  topLevel: string;
  gitDir: string;
  gitCommonDir: string;
};

export async function discoverProjects(
  input: ProjectDiscoveryInput,
): Promise<ProjectDiscoveryResult> {
  const searchRoots = await resolveSearchRoots(input.searchRoots);
  const blacklistRoots = await resolveBlacklistRoots(input.blacklistRoots);
  const discoveredProjectPaths = new Set<string>();

  for (const searchRoot of searchRoots) {
    await scanDirectory(searchRoot, blacklistRoots, discoveredProjectPaths);
  }

  const projects = sortProjects(
    [...discoveredProjectPaths].map((projectPath) =>
      createDetectedProject(projectPath),
    ),
  );

  return { searchRoots, blacklistRoots, projects };
}

async function resolveSearchRoots(
  searchRootInputs: string[],
): Promise<string[]> {
  if (searchRootInputs.length === 0) {
    throw new ProjectError(
      "Search Roots Required",
      "Add at least one search root before refreshing the project list.",
    );
  }

  return resolveDirectoryList(
    searchRootInputs,
    "Search root",
    "Search Root Not Found",
    "Search Root Is Not a Directory",
  );
}

async function resolveBlacklistRoots(
  blacklistRootInputs: string[],
): Promise<string[]> {
  if (blacklistRootInputs.length === 0) {
    return [];
  }

  return resolveDirectoryList(
    blacklistRootInputs,
    "Blacklist folder",
    "Blacklist Folder Not Found",
    "Blacklist Folder Is Not a Directory",
  );
}

async function resolveDirectoryList(
  directoryInputs: string[],
  label: string,
  missingTitle: string,
  notDirectoryTitle: string,
): Promise<string[]> {
  const normalizedRoots = new Set<string>();

  for (const directoryInput of directoryInputs) {
    const normalizedRoot = normalizeDirectoryPath(directoryInput, label);

    await ensureDirectoryExists(
      normalizedRoot,
      missingTitle,
      notDirectoryTitle,
    );
    normalizedRoots.add(normalizedRoot);
  }

  return [...normalizedRoots].sort((left, right) => left.localeCompare(right));
}

async function ensureDirectoryExists(
  directoryPath: string,
  missingTitle: string,
  notDirectoryTitle: string,
): Promise<void> {
  let stats;

  try {
    stats = await fs.stat(directoryPath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new ProjectError(
        missingTitle,
        `${directoryPath} does not exist or cannot be reached.`,
      );
    }

    throw new ProjectError(
      "Unable To Read Search Root",
      `Raycast could not access ${directoryPath}.`,
    );
  }

  if (!stats.isDirectory()) {
    throw new ProjectError(
      notDirectoryTitle,
      `${directoryPath} is not a directory.`,
    );
  }
}

async function scanDirectory(
  directoryPath: string,
  blacklistRoots: string[],
  discoveredProjectPaths: Set<string>,
): Promise<void> {
  if (isBlacklistedDirectory(directoryPath, blacklistRoots)) {
    return;
  }

  const directoryEntries = await readDirectoryEntries(directoryPath);
  const isRepository = await isRepositoryDirectory(
    directoryPath,
    directoryEntries,
  );

  if (isRepository) {
    discoveredProjectPaths.add(directoryPath);
  }

  const childDirectoryPaths = directoryEntries
    .filter(shouldTraverseDirectoryEntry)
    .map((entry) => path.join(directoryPath, entry.name));

  for (const childDirectoryPath of childDirectoryPaths) {
    await scanDirectory(
      childDirectoryPath,
      blacklistRoots,
      discoveredProjectPaths,
    );
  }
}

function isBlacklistedDirectory(
  directoryPath: string,
  blacklistRoots: string[],
): boolean {
  return blacklistRoots.some((blacklistRoot) => {
    const relativePath = path.relative(blacklistRoot, directoryPath);
    const isSameDirectory = relativePath === "";
    const isNestedDirectory =
      relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath);

    return isSameDirectory || isNestedDirectory;
  });
}

async function isRepositoryDirectory(
  directoryPath: string,
  directoryEntries: Dirent[],
): Promise<boolean> {
  if (!hasGitEntry(directoryEntries)) {
    return false;
  }

  const gitMetadataPaths = await readGitMetadataPaths(directoryPath);
  if (gitMetadataPaths == null) {
    return false;
  }

  if (!isRepositoryRoot(directoryPath, gitMetadataPaths)) {
    return false;
  }

  return !isLinkedWorktree(gitMetadataPaths);
}

async function readGitMetadataPaths(
  directoryPath: string,
): Promise<GitMetadataPaths | null> {
  try {
    const { stdout } = await execFileAsync("git", gitProjectKindArgs, {
      cwd: directoryPath,
      maxBuffer: 10 * 1024 * 1024,
    });
    const metadataPaths = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const [topLevel, gitDir, gitCommonDir] = metadataPaths;

    if (topLevel == null || gitDir == null || gitCommonDir == null) {
      return null;
    }

    return {
      topLevel: path.normalize(topLevel),
      gitDir: path.normalize(gitDir),
      gitCommonDir: path.normalize(gitCommonDir),
    };
  } catch (error) {
    if (isMissingExecutableError(error)) {
      throw new ProjectError(
        "Git Not Found",
        "Raycast could not run git while scanning your search roots.",
      );
    }

    if (isGitProbeFailure(error)) {
      return null;
    }

    throw new ProjectError(
      "Unable To Scan Search Root",
      `Raycast could not inspect Git metadata for ${directoryPath}.`,
    );
  }
}

function shouldTraverseDirectoryEntry(entry: Dirent): boolean {
  if (entry.name === ".git") return false;
  if (!entry.isDirectory()) return false;

  return !entry.isSymbolicLink();
}

function hasGitEntry(directoryEntries: Dirent[]): boolean {
  return directoryEntries.some(
    (entry) => entry.name === ".git" && (entry.isDirectory() || entry.isFile()),
  );
}

function isRepositoryRoot(
  directoryPath: string,
  gitMetadataPaths: GitMetadataPaths,
): boolean {
  return gitMetadataPaths.topLevel === path.normalize(directoryPath);
}

function isLinkedWorktree(gitMetadataPaths: GitMetadataPaths): boolean {
  return gitMetadataPaths.gitDir !== gitMetadataPaths.gitCommonDir;
}

async function readDirectoryEntries(directoryPath: string) {
  try {
    return await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (isIgnorableFileSystemError(error)) {
      return [];
    }

    throw new ProjectError(
      "Unable To Scan Search Root",
      `Raycast could not scan ${directoryPath}.`,
    );
  }
}

function isMissingExecutableError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return isNodeError(error) && error.code === "ENOENT";
}

function isGitProbeFailure(error: unknown): boolean {
  if (!isNodeError(error)) {
    return false;
  }

  return "stdout" in error || "stderr" in error || "code" in error;
}

function isIgnorableFileSystemError(error: unknown): boolean {
  return (
    isNodeError(error) &&
    (error.code === "ENOENT" ||
      error.code === "ENOTDIR" ||
      error.code === "EACCES" ||
      error.code === "EPERM")
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
