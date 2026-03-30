# Neovim Launcher

Raycast extension for opening projects in Neovim through WezTerm.

It helps you keep a project list inside Raycast so you can:

- launch a detected or saved project in Neovim
- scan folders for Git projects
- add projects manually when needed
- reuse an existing WezTerm pane for the same project when possible

## Commands

### Launch Project

Shows your saved and detected projects, then opens the selected project in Neovim.

### Add New Project

Adds a project manually by name and path.

### Refresh Project List

Scans your configured search roots again and updates the detected project list.

## Setup

This extension expects:

- WezTerm installed and available to Raycast
- Neovim installed and available to Raycast
- one or more search roots configured for project discovery

The extension preferences let you override the default paths for:

- `wezterm`
- `nvim`
