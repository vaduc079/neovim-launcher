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
import {
  ensureProjectDirectory,
  loadProjects,
  Project,
  ProjectConfigError,
} from "./projects";
import { createTerminalLauncher } from "./terminals";

type LoadState = {
  isLoading: boolean;
  projects: Project[];
  error?: ProjectConfigError;
};

const exampleConfigPath = "examples/projects.example.json";

export default function Command() {
  const preferences = getResolvedPreferences();
  const [loadState, setLoadState] = useState<LoadState>({
    isLoading: true,
    projects: [],
  });
  const [launchingProjectId, setLaunchingProjectId] = useState<string>();

  useEffect(() => {
    let isCancelled = false;

    async function loadProjectList() {
      const nextLoadState = await getLoadState(preferences.projectConfigFile);
      if (isCancelled) return;

      setLoadState(nextLoadState);
    }

    void loadProjectList();

    return () => {
      isCancelled = true;
    };
  }, [preferences.projectConfigFile]);

  async function handleLaunch(project: Project) {
    if (launchingProjectId != null) return;

    setLaunchingProjectId(project.id);
    const toast = await showLoadingToast(project.name);

    try {
      await ensureProjectDirectory(project);

      const terminalLauncher = createTerminalLauncher(
        preferences.weztermExecutable,
      );
      await terminalLauncher.launchProject({
        project,
        editorCommand: preferences.editorCommand,
      });

      showLaunchSuccess(toast, project.name);
      await closeMainWindow();
    } catch (error) {
      showLaunchFailure(toast, error);
    } finally {
      setLaunchingProjectId(undefined);
    }
  }

  const isEmpty = !loadState.isLoading && loadState.projects.length === 0;

  return (
    <List
      isLoading={loadState.isLoading}
      searchBarPlaceholder="Choose a project to open in Neovim"
    >
      {loadState.projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.path}
          icon={Icon.Terminal}
          accessories={
            project.description ? [{ text: project.description }] : undefined
          }
          actions={
            <ProjectActions
              isLaunching={launchingProjectId === project.id}
              onLaunch={() => void handleLaunch(project)}
            />
          }
        />
      ))}
      {isEmpty ? (
        <List.EmptyView
          title={loadState.error?.title ?? "No Projects Found"}
          description={
            loadState.error?.message ??
            `Update the Project Config File preference and use ${exampleConfigPath} as a starting point.`
          }
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

async function getLoadState(projectConfigFile: string): Promise<LoadState> {
  try {
    const projects = await loadProjects(projectConfigFile);

    return {
      isLoading: false,
      projects,
    };
  } catch (error) {
    return {
      isLoading: false,
      projects: [],
      error: toProjectConfigError(error),
    };
  }
}

async function showLoadingToast(projectName: string) {
  return showToast({
    style: Toast.Style.Animated,
    title: `Opening ${projectName}`,
  });
}

function showLaunchSuccess(toast: Toast, projectName: string) {
  toast.style = Toast.Style.Success;
  toast.title = `Opened ${projectName}`;
}

function showLaunchFailure(toast: Toast, error: unknown) {
  const projectError = toProjectConfigError(error);

  toast.style = Toast.Style.Failure;
  toast.title = projectError.title;
  toast.message = projectError.message;
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

function toProjectConfigError(error: unknown): ProjectConfigError {
  if (error instanceof ProjectConfigError) {
    return error;
  }

  return new ProjectConfigError(
    "Launch Failed",
    error instanceof Error ? error.message : "Unknown error.",
  );
}
