import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { discoverProjects } from "./project-discovery";
import { saveDiscoveryResult } from "./project-store";
import { toProjectError } from "./projects";

type SearchRootsFormValues = {
  searchRoots: string;
  blacklistRoots: string;
};

type SearchRootsFormProps = {
  initialSearchRoots?: string[];
  initialBlacklistRoots?: string[];
  navigationTitle: string;
  submitTitle: string;
  onSaved?: () => Promise<void> | void;
};

export function SearchRootsForm(props: SearchRootsFormProps) {
  const initialSearchRoots = props.initialSearchRoots ?? [];
  const initialBlacklistRoots = props.initialBlacklistRoots ?? [];
  const previousSearchRootsRef = useRef(initialSearchRoots);
  const previousBlacklistRootsRef = useRef(initialBlacklistRoots);
  const [searchRootsText, setSearchRootsText] = useState(() =>
    formatDirectoryList(initialSearchRoots),
  );
  const [blacklistRootsText, setBlacklistRootsText] = useState(() =>
    formatDirectoryList(initialBlacklistRoots),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const searchRootsChanged = !arePathListsEqual(
      previousSearchRootsRef.current,
      initialSearchRoots,
    );
    const blacklistRootsChanged = !arePathListsEqual(
      previousBlacklistRootsRef.current,
      initialBlacklistRoots,
    );

    if (searchRootsChanged) {
      setSearchRootsText(formatDirectoryList(initialSearchRoots));
      previousSearchRootsRef.current = initialSearchRoots;
    }

    if (blacklistRootsChanged) {
      setBlacklistRootsText(formatDirectoryList(initialBlacklistRoots));
      previousBlacklistRootsRef.current = initialBlacklistRoots;
    }
  }, [props.initialSearchRoots, props.initialBlacklistRoots]);

  async function handleSubmit(values: SearchRootsFormValues) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing project list",
    });

    try {
      const discoveryResult = await discoverProjects({
        searchRoots: parseDirectoryList(values.searchRoots),
        blacklistRoots: parseDirectoryList(values.blacklistRoots),
      });
      await saveDiscoveryResult(discoveryResult);

      toast.style = Toast.Style.Success;
      toast.title = buildRefreshSuccessTitle(discoveryResult.projects.length);

      if (props.onSaved != null) {
        await props.onSaved();
        return;
      }

      await closeMainWindow();
    } catch (error) {
      const projectError = toProjectError(error);

      toast.style = Toast.Style.Failure;
      toast.title = projectError.title;
      toast.message = projectError.message;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={props.navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm<SearchRootsFormValues>
            title={isSubmitting ? "Refreshing…" : props.submitTitle}
            onSubmit={(values) => void handleSubmit(values)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="searchRoots"
        title="Search Roots"
        placeholder="~/projects&#10;~/work"
        info="Use one absolute path or ~/path per line."
        storeValue={false}
        value={searchRootsText}
        onChange={setSearchRootsText}
      />
      <Form.TextArea
        id="blacklistRoots"
        title="Blacklist Folders"
        placeholder="~/projects/archive&#10;~/projects/vendor"
        info="Discovery skips these folders and everything nested inside them."
        storeValue={false}
        value={blacklistRootsText}
        onChange={setBlacklistRootsText}
      />
    </Form>
  );
}

function buildRefreshSuccessTitle(projectCount: number): string {
  const label = projectCount === 1 ? "project" : "projects";
  return `Saved ${projectCount} detected ${label}`;
}

function formatDirectoryList(paths: string[]): string {
  return paths.join("\n");
}

function parseDirectoryList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function arePathListsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
