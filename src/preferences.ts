import { getPreferenceValues } from "@raycast/api";

export type ExtensionPreferences = {
  projectConfigFile: string;
  weztermExecutable?: string;
  editorCommand?: string;
};

export type ResolvedPreferences = {
  projectConfigFile: string;
  weztermExecutable: string;
  editorCommand: string;
};

export function getResolvedPreferences(): ResolvedPreferences {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const weztermExecutable =
    preferences.weztermExecutable?.trim() || "/opt/homebrew/bin/wezterm";
  const editorCommand =
    preferences.editorCommand?.trim() || "/opt/homebrew/bin/nvim";

  return {
    projectConfigFile: preferences.projectConfigFile,
    weztermExecutable,
    editorCommand,
  };
}
