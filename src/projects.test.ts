import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createDetectedProject,
  createManualProject,
  mergeProjects,
  ProjectError,
} from "./projects";

describe("createManualProject", () => {
  it("normalizes manual project input", () => {
    const project = createManualProject({
      name: "  Alpha  ",
      path: "~/projects/alpha",
      description: "  Main repo  ",
    });

    expect(project).toEqual({
      name: "Alpha",
      path: path.join(os.homedir(), "projects/alpha"),
      description: "Main repo",
      source: "manual",
    });
  });

  it("rejects relative project paths", () => {
    expect(() =>
      createManualProject({
        name: "Alpha",
        path: "./alpha",
      }),
    ).toThrow(ProjectError);
  });
});

describe("mergeProjects", () => {
  it("prefers manual projects when paths overlap", () => {
    const detectedProject = createDetectedProject("/tmp/project");
    const manualProject = createManualProject({
      name: "My Project",
      path: "/tmp/project",
      description: "Pinned",
    });

    expect(mergeProjects([detectedProject], [manualProject])).toEqual([
      manualProject,
    ]);
  });
});
