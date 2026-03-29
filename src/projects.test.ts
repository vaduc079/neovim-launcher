import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseProjectConfig, ProjectConfigError } from "./projects";

describe("parseProjectConfig", () => {
  it("parses a top-level projects array", () => {
    const rawConfig = JSON.stringify([
      { name: "Alpha", path: "~/work/alpha" },
      { name: "Beta", path: "./beta", description: "Second project" },
    ]);
    const configDirectory = "/tmp/projects";

    const projects = parseProjectConfig(rawConfig, configDirectory);

    expect(projects).toEqual([
      {
        id: path.join(os.homedir(), "work/alpha"),
        name: "Alpha",
        path: path.join(os.homedir(), "work/alpha"),
      },
      {
        id: path.resolve(configDirectory, "beta"),
        name: "Beta",
        path: path.resolve(configDirectory, "beta"),
        description: "Second project",
      },
    ]);
  });

  it("parses an object with a projects array", () => {
    const rawConfig = JSON.stringify({
      projects: [{ name: "Config", path: "/Users/duc.vu/configs" }],
    });

    const projects = parseProjectConfig(rawConfig, "/tmp");

    expect(projects).toEqual([
      {
        id: "/Users/duc.vu/configs",
        name: "Config",
        path: "/Users/duc.vu/configs",
      },
    ]);
  });

  it("rejects malformed config shapes", () => {
    expect(() =>
      parseProjectConfig(JSON.stringify({ invalid: [] }), "/tmp"),
    ).toThrow(ProjectConfigError);
  });

  it("rejects duplicate project paths", () => {
    const rawConfig = JSON.stringify([
      { name: "One", path: "/tmp/app" },
      { name: "Two", path: "/tmp/app" },
    ]);

    expect(() => parseProjectConfig(rawConfig, "/tmp")).toThrow(
      "duplicate project paths",
    );
  });
});
