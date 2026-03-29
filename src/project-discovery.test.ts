import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { discoverProjects } from "./project-discovery";

const tempDirectories: string[] = [];
const execFileAsync = promisify(execFile);

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const tempDirectory = tempDirectories.pop();
    if (tempDirectory == null) continue;

    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
});

describe("discoverProjects", () => {
  it("finds repository roots and excludes linked worktree and nested .git false positives", async () => {
    const workspaceRoot = await createTempDirectory();
    const alphaProjectPath = path.join(workspaceRoot, "alpha");
    const betaProjectPath = path.join(workspaceRoot, "nested", "beta");
    const worktreeProjectPath = path.join(workspaceRoot, "scratch", "linked");

    await createGitDirectoryProject(alphaProjectPath);
    await createNestedGitDirectoryNoise(alphaProjectPath);
    await createSeparateGitDirectoryProject(betaProjectPath);
    await createLinkedWorktreeProject(worktreeProjectPath);

    const result = await discoverProjects({
      searchRoots: [workspaceRoot, workspaceRoot],
      blacklistRoots: [],
    });

    expect(result.searchRoots).toEqual([workspaceRoot]);
    expect(result.blacklistRoots).toEqual([]);
    expect(result.projects).toEqual([
      {
        name: "alpha",
        path: alphaProjectPath,
        source: "detected",
      },
      {
        name: "beta",
        path: betaProjectPath,
        source: "detected",
      },
    ]);
  });

  it("rejects missing search roots", async () => {
    await expect(
      discoverProjects({
        searchRoots: ["/tmp/does-not-exist-raycast"],
        blacklistRoots: [],
      }),
    ).rejects.toMatchObject({
      title: "Search Root Not Found",
    });
  });

  it("skips blacklisted folders and their nested repositories", async () => {
    const workspaceRoot = await createTempDirectory();
    const includedProjectPath = path.join(workspaceRoot, "alpha");
    const blacklistedRoot = path.join(workspaceRoot, "archive");
    const skippedProjectPath = path.join(blacklistedRoot, "beta");
    const siblingProjectPath = path.join(workspaceRoot, "archive-copy");

    await createGitDirectoryProject(includedProjectPath);
    await createGitDirectoryProject(skippedProjectPath);
    await createGitDirectoryProject(siblingProjectPath);

    const result = await discoverProjects({
      searchRoots: [workspaceRoot],
      blacklistRoots: [blacklistedRoot],
    });

    expect(result.blacklistRoots).toEqual([blacklistedRoot]);
    expect(result.projects).toEqual([
      {
        name: "alpha",
        path: includedProjectPath,
        source: "detected",
      },
      {
        name: "archive-copy",
        path: siblingProjectPath,
        source: "detected",
      },
    ]);
  });
});

async function createTempDirectory(): Promise<string> {
  const tempRoot = await fs.realpath(os.tmpdir());
  const tempDirectory = await fs.mkdtemp(
    path.join(tempRoot, "neovim-launcher-discovery-"),
  );
  tempDirectories.push(tempDirectory);

  return tempDirectory;
}

async function createGitDirectoryProject(projectPath: string): Promise<void> {
  await runGit(["init", projectPath]);
}

async function createNestedGitDirectoryNoise(
  projectPath: string,
): Promise<void> {
  const nestedPath = path.join(projectPath, ".claude", ".git");

  await fs.mkdir(nestedPath, { recursive: true });
  await fs.writeFile(path.join(nestedPath, "config"), "[core]\n");
}

async function createSeparateGitDirectoryProject(
  projectPath: string,
): Promise<void> {
  const gitDirectoryPath = path.join(
    await createTempDirectory(),
    path.basename(projectPath),
  );

  await runGit(["init", "--separate-git-dir", gitDirectoryPath, projectPath]);
}

async function createLinkedWorktreeProject(projectPath: string): Promise<void> {
  const sourceRepositoryPath = path.join(
    await createTempDirectory(),
    "source-repository",
  );
  const initialFilePath = path.join(sourceRepositoryPath, "README.md");

  await runGit(["init", sourceRepositoryPath]);
  await fs.writeFile(initialFilePath, "seed\n");
  await runGit(["add", "README.md"], sourceRepositoryPath);
  await runGit(
    [
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-m",
      "init",
    ],
    sourceRepositoryPath,
  );
  await runGit(
    ["worktree", "add", projectPath, "-b", "linked-worktree"],
    sourceRepositoryPath,
  );
}

async function runGit(args: string[], cwd?: string): Promise<void> {
  await execFileAsync("git", args, {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
}
