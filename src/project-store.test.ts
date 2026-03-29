import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { storage, getItem, setItem } = vi.hoisted(() => {
  const storage = new Map<string, string>();
  const getItem = vi.fn(async (key: string) => storage.get(key));
  const setItem = vi.fn(async (key: string, value: string) => {
    storage.set(key, value);
  });

  return { storage, getItem, setItem };
});

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem,
    setItem,
  },
}));

import {
  getProjectCatalogState,
  saveDiscoveryResult,
  saveManualProject,
} from "./project-store";

describe("project-store", () => {
  beforeEach(() => {
    storage.clear();
    getItem.mockClear();
    setItem.mockClear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks initial discovery complete even when no projects are found", async () => {
    await saveDiscoveryResult({
      searchRoots: ["/tmp/work"],
      blacklistRoots: ["/tmp/work/archive"],
      projects: [],
    });

    const catalogState = await getProjectCatalogState();

    expect(catalogState.hasCompletedInitialDiscovery).toBe(true);
    expect(catalogState.searchRoots).toEqual(["/tmp/work"]);
    expect(catalogState.blacklistRoots).toEqual(["/tmp/work/archive"]);
    expect(catalogState.projects).toEqual([]);
    expect(catalogState.lastRefreshedAt).toBe("2026-03-29T12:00:00.000Z");
  });

  it("merges detected and manual projects with manual precedence", async () => {
    await saveDiscoveryResult({
      searchRoots: ["/tmp/work"],
      blacklistRoots: [],
      projects: [
        {
          name: "alpha",
          path: "/tmp/work/alpha",
          source: "detected",
        },
      ],
    });
    await saveManualProject({
      name: "Alpha Manual",
      path: "/tmp/work/alpha",
      description: "Pinned",
    });

    const catalogState = await getProjectCatalogState();

    expect(catalogState.projects).toEqual([
      {
        name: "Alpha Manual",
        path: "/tmp/work/alpha",
        description: "Pinned",
        source: "manual",
      },
    ]);
  });

  it("rejects duplicate manual project paths", async () => {
    await saveManualProject({
      name: "Alpha",
      path: "/tmp/work/alpha",
    });

    await expect(
      saveManualProject({
        name: "Alpha Again",
        path: "/tmp/work/alpha",
      }),
    ).rejects.toMatchObject({
      title: "Duplicate Project Path",
    });
  });

  it("treats missing stored blacklist folders as an empty list", async () => {
    storage.set(
      "project-discovery-state",
      JSON.stringify({
        searchRoots: ["/tmp/work"],
        detectedProjects: [],
        hasCompletedInitialDiscovery: true,
        lastRefreshedAt: "2026-03-29T12:00:00.000Z",
      }),
    );

    const catalogState = await getProjectCatalogState();

    expect(catalogState.blacklistRoots).toEqual([]);
  });
});
