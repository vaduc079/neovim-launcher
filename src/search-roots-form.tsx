import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";

import { discoverProjects } from "./project-discovery";
import { saveDiscoveryResult } from "./project-store";
import { toProjectError } from "./projects";

type SearchRootsFormValues = {
  searchRoots: string;
};

type SearchRootsFormProps = {
  initialSearchRoots?: string[];
  navigationTitle: string;
  submitTitle: string;
  onSaved?: () => Promise<void> | void;
};

export function SearchRootsForm(props: SearchRootsFormProps) {
  const [searchRootsText, setSearchRootsText] = useState(
    formatSearchRoots(props.initialSearchRoots ?? []),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: SearchRootsFormValues) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing project list",
    });

    try {
      const discoveryResult = await discoverProjects(
        parseSearchRoots(values.searchRoots),
      );
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
    </Form>
  );
}

function buildRefreshSuccessTitle(projectCount: number): string {
  const label = projectCount === 1 ? "project" : "projects";
  return `Saved ${projectCount} detected ${label}`;
}

function formatSearchRoots(paths: string[]): string {
  return paths.join("\n");
}

function parseSearchRoots(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
