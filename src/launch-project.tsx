import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { getResolvedPreferences } from "./preferences";
import { getProjectCatalogState, ProjectCatalogState } from "./project-store";
import {
  ensureProjectDirectory,
  Project,
  ProjectError,
  toProjectError,
} from "./projects";
import { SearchRootsForm } from "./search-roots-form";
import { createTerminalLauncher } from "./terminals";

type ViewState = {
  isLoading: boolean;
  projects: Project[];
  searchRoots: string[];
  blacklistRoots: string[];
  hasCompletedInitialDiscovery: boolean;
  error?: ProjectError;
};

const emptyViewDescription =
  "Use Refresh Project List to rescan your folders, or Add New Project to save one manually.";
const initialViewState: ViewState = {
  isLoading: true,
  projects: [],
  searchRoots: [],
  blacklistRoots: [],
  hasCompletedInitialDiscovery: false,
};

export default function Command() {
  const preferences = getResolvedPreferences();
  const [viewState, setViewState] = useState<ViewState>(initialViewState);
  const [launchingProjectPath, setLaunchingProjectPath] = useState<string>();

  useEffect(() => {
    let isCancelled = false;

    async function loadAndSetViewState() {
      const nextViewState = await loadViewState();
      if (isCancelled) return;

      setViewState(nextViewState);
    }

    void loadAndSetViewState();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function reloadProjectCatalog() {
    setViewState((currentState) => toLoadingViewState(currentState));
    setViewState(await loadViewState());
  }

  async function handleLaunch(project: Project) {
    if (launchingProjectPath != null) return;

    setLaunchingProjectPath(project.path);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${project.name}`,
    });

    try {
      await ensureProjectDirectory(project);

      const terminalLauncher = createTerminalLauncher(
        preferences.weztermExecutable,
      );
      await terminalLauncher.launchProject({
        project,
        editorCommand: preferences.editorCommand,
      });

      toast.style = Toast.Style.Success;
      toast.title = `Opened ${project.name}`;
      await closeMainWindow();
    } catch (error) {
      const projectError = toProjectError(error);

      toast.style = Toast.Style.Failure;
      toast.title = projectError.title;
      toast.message = projectError.message;
    } finally {
      setLaunchingProjectPath(undefined);
    }
  }

  const shouldShowBootstrap =
    !viewState.isLoading &&
    !viewState.hasCompletedInitialDiscovery &&
    viewState.error == null;

  if (shouldShowBootstrap) {
    return (
      <SearchRootsForm
        initialSearchRoots={viewState.searchRoots}
        initialBlacklistRoots={viewState.blacklistRoots}
        navigationTitle="Build Project List"
        submitTitle="Build Project List"
        onSaved={() => reloadProjectCatalog()}
      />
    );
  }

  return (
    <List
      isLoading={viewState.isLoading}
      searchBarPlaceholder="Choose a project to open in Neovim"
    >
      {viewState.projects.map((project) => (
        <List.Item
          key={project.path}
          title={project.name}
          subtitle={project.path}
          icon={Icon.Terminal}
          accessories={
            project.description ? [{ text: project.description }] : undefined
          }
          actions={
            <ProjectActions
              isLaunching={launchingProjectPath === project.path}
              onLaunch={() => void handleLaunch(project)}
            />
          }
        />
      ))}
      {!viewState.isLoading && viewState.projects.length === 0 ? (
        <List.EmptyView
          title={viewState.error?.title ?? "No Projects Found"}
          description={viewState.error?.message ?? emptyViewDescription}
          actions={
            <ActionPanel>
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function toViewState(projectCatalogState: ProjectCatalogState): ViewState {
  return {
    isLoading: false,
    projects: projectCatalogState.projects,
    searchRoots: projectCatalogState.searchRoots,
    blacklistRoots: projectCatalogState.blacklistRoots,
    hasCompletedInitialDiscovery:
      projectCatalogState.hasCompletedInitialDiscovery,
  };
}

async function loadViewState(): Promise<ViewState> {
  try {
    const projectCatalogState = await getProjectCatalogState();
    return toViewState(projectCatalogState);
  } catch (error) {
    return toErrorViewState(error);
  }
}

function toLoadingViewState(viewState: ViewState): ViewState {
  return {
    ...viewState,
    isLoading: true,
    error: undefined,
  };
}

function toErrorViewState(error: unknown): ViewState {
  return {
    ...initialViewState,
    isLoading: false,
    error: toProjectError(error),
  };
}

function ProjectActions(props: { isLaunching: boolean; onLaunch: () => void }) {
  return (
    <ActionPanel>
      <Action
        title={props.isLaunching ? "Launching Project…" : "Launch Project"}
        icon={Icon.Play}
        onAction={props.onLaunch}
      />
      <OpenPreferencesAction />
    </ActionPanel>
  );
}

function OpenPreferencesAction() {
  return (
    <Action
      title="Open Extension Preferences"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );
}
