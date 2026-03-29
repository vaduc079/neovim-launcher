import { SearchRootsForm } from "./search-roots-form";
import { useEffect, useState } from "react";

import { getProjectCatalogState } from "./project-store";

export default function Command() {
  const [searchRoots, setSearchRoots] = useState<string[]>([]);

  useEffect(() => {
    let isCancelled = false;

    async function loadSearchRoots() {
      const projectCatalogState = await getProjectCatalogState();
      if (isCancelled) return;

      setSearchRoots(projectCatalogState.searchRoots);
    }

    void loadSearchRoots();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <SearchRootsForm
      initialSearchRoots={searchRoots}
      navigationTitle="Refresh Project List"
      submitTitle="Refresh Project List"
    />
  );
}
