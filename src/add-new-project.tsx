import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";

import { saveManualProject } from "./project-store";
import { toProjectError } from "./projects";

type AddProjectFormValues = {
  name: string;
  path: string;
  description?: string;
};

export default function Command() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: AddProjectFormValues) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving project",
    });

    try {
      await saveManualProject(values);

      toast.style = Toast.Style.Success;
      toast.title = `Saved ${values.name.trim()}`;
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
      navigationTitle="Add New Project"
      actions={
        <ActionPanel>
          <Action.SubmitForm<AddProjectFormValues>
            title={isSubmitting ? "Saving…" : "Save Project"}
            onSubmit={(values) => void handleSubmit(values)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Project"
        storeValue={false}
      />
      <Form.TextField
        id="path"
        title="Path"
        placeholder="~/projects/my-project"
        info="Use an absolute path or ~/path."
        storeValue={false}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional note"
        storeValue={false}
      />
    </Form>
  );
}
