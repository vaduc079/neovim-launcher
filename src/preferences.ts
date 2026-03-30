import { getPreferenceValues } from "@raycast/api";

export type ExtensionPreferences = {
  weztermExecutable?: string;
  editorCommand?: string;
};

export type ResolvedPreferences = {
  weztermExecutable: string;
  editorCommand: string;
};

export function getResolvedPreferences(): ResolvedPreferences {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const weztermExecutable =
    preferences.weztermExecutable?.trim() || "/opt/homebrew/bin/wezterm";
  const editorCommand = preferences.editorCommand?.trim() || "nvim";

  return {
    weztermExecutable,
    editorCommand,
  };
}
