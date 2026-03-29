import { Detail } from "@raycast/api";
import { SearchRootsForm } from "./search-roots-form";
import { useEffect, useState } from "react";

import { getProjectCatalogState } from "./project-store";
import { ProjectError, toProjectError } from "./projects";

type RefreshViewState = {
  isLoading: boolean;
  searchRoots: string[];
  blacklistRoots: string[];
  error?: ProjectError;
};

const initialViewState: RefreshViewState = {
  isLoading: true,
  searchRoots: [],
  blacklistRoots: [],
};

export default function Command() {
  const [viewState, setViewState] = useState(initialViewState);

  useEffect(() => {
    let isCancelled = false;

    async function loadViewState() {
      try {
        const projectCatalogState = await getProjectCatalogState();
        if (isCancelled) return;

        setViewState({
          isLoading: false,
          searchRoots: projectCatalogState.searchRoots,
          blacklistRoots: projectCatalogState.blacklistRoots,
        });
      } catch (error) {
        if (isCancelled) return;

        setViewState({
          ...initialViewState,
          isLoading: false,
          error: toProjectError(error),
        });
      }
    }

    void loadViewState();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (viewState.error != null) {
    return (
      <Detail
        markdown={buildErrorMarkdown(viewState.error)}
        navigationTitle="Refresh Project List"
      />
    );
  }

  if (viewState.isLoading) {
    return (
      <Detail isLoading markdown="" navigationTitle="Refresh Project List" />
    );
  }

  return (
    <SearchRootsForm
      initialSearchRoots={viewState.searchRoots}
      initialBlacklistRoots={viewState.blacklistRoots}
      navigationTitle="Refresh Project List"
      submitTitle="Refresh Project List"
    />
  );
}

function buildErrorMarkdown(error: ProjectError): string {
  return `# ${error.title}\n\n${error.message}`;
}
