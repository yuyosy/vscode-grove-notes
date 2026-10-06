# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Refer to the GitHub main branch for the latest changes after release.

## [0.3.1] - 2026-10-31

### Fixed

- Tag editing now preserves note metadata and unsaved content.
- Improved tag browsing reliability, including for notes with repeated or unusual tags.
- Auto-commit settings now take effect correctly without overlapping runs.
- External note changes refresh the view even when Jujutsu is disabled or unavailable.
- `.gitignore` rules are consistently respected in note lists, tag results, and the tree view.

## [0.3.0] - 2026-05-23

### Added

- `grove-notes.pathSeparator` setting with `auto`, `/`, and `\` options.
- `grove-notes.hideIgnoreFilesInTagsView` setting to control visibility of .gitignored files in the tags view.
- `grove-notes.enableTagsInView` setting to toggle tag visibility in the tree view.
- Drag-and-drop support for moving notes and folders within the tree view.
- "New Folder" command in the right-click context menu.
- "Open Settings" command in the notes view title menu.

### Changed

- Copied note paths and relative path labels use the same configured separator.
- Configuration access and path formatting helpers were refactored for more consistent settings handling.
- Jujutsu commands were moved to the dropdown menu in the notes view title.

## [0.2.1] - 2026-05-15

### Added

- "Collapse All" button in the notes view.

### Changed

- Configuration title in `settings.json`.

## [0.2.0] - 2026-05-05

### Removed

- Jujutsu binary from the extension bundle.

## [0.1.1] - 2026-04-20

### Changed

- Refactored the codebase.

## [0.1.0] - 2026-04-19

### Added

- Initial release.

[Unreleased]: https://github.com/yuyosy/vscode-grove-notes/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/yuyosy/vscode-grove-notes/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/yuyosy/vscode-grove-notes/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/yuyosy/vscode-grove-notes/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/yuyosy/vscode-grove-notes/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/yuyosy/vscode-grove-notes/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/yuyosy/vscode-grove-notes/releases/tag/v0.1.0
