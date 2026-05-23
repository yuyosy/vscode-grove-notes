# CHANGELOG

## v0.3.0 - 2026-05-23
- Add new settings
  - Add `grove-notes.pathSeparator` setting with `auto`, `/`, and `\` options.
  - Add `grove-notes.hideIgnoreFilesInTagsView` setting to control visibility of .gitignored files in the tags view.
  - Add `grove-notes.enableTagsInView` setting to toggle tag visibility in the tree view.
- Add new features and improvements
  - Add drag-and-drop support for moving notes and folders within the tree view.
  - Add `New Folder` right-click context menu.
  - Make copied note paths and relative path labels use the same configured separator.
  - Refactor configuration access and path formatting helpers for more consistent settings handling.
  - Add "Open Settings" command to the notes view title menu.
  - Moved jj commands to dropdown menu in the notes view title.

## v0.2.1 - 2026-05-15
- Add "Collapse All" button to the notes view.
- Change the config title in settings.json

## v0.2.0 - 2026-05-05
- Removed the Jujutsu binary from the extension bundle.

## v0.1.1 - 2026-04-20
- Refactor the codebase

## v0.1.0 - 2026-04-19
- First release
