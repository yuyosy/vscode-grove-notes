<h1 align="center">
  <a href="https://github.com/yuyosy/vscode-grove-notes" target="_blank">
    <img src="resources/icon/product-icon.png" alt="GroveNotes Logo" width="200px">
  </a><br>
    GroveNotes – Note Explorer
</h1>
<p align="center">Manage your notes in a tree view directly from the sidebar in VS Code and VS Code-based editors.</p>

**日本語版: [README.ja.md](README.ja.md)**


## Features
GroveNotes is a Visual Studio Code extension that helps you organize and manage your notes without leaving your editor.

- Tree view for notes management
- Support for nested folders and markdown files
- Note templates for quick creation
- Tagging system for easy organization
- Jujutsu VCS integration for version control

## Installation

The extension is available on the Visual Studio Code Marketplace and Open VSX Registry.

- [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yuyosy.vscode-grove-notes)
- [Open VSX Registry](https://open-vsx.org/extension/yuyosy/vscode-grove-notes)

## Jujutsu Dependency

This extension does not bundle the `jj` binary.

- **[Jujutsu (jj)](https://github.com/jj-vcs/jj)** - Version control system
  - License: Apache License 2.0
  - Used only when version control features are enabled
  - GroveNotes resolves `jj` from your system PATH or from the optional `grove-notes.versionControl.jjPath` setting

If you want to use Jujutsu features, install `jj` from:
- Official website: https://www.jj-vcs.dev/latest/
- GitHub releases: https://github.com/jj-vcs/jj/releases

## Usage / Screenshots

TODO: Add usage instructions and screenshots here.

## Template Variables

Templates (`.md` files in the templates folder) and filename format strings support the following tokens inside `{{ }}`.

### Date / Time

| Token | Description | Example |
|---|---|---|
| `{{YYYY}}` | 4-digit year | `2026` |
| `{{MM}}` | 2-digit month | `04` |
| `{{DD}}` | 2-digit day | `15` |
| `{{HH}}` | 2-digit hour (24h) | `09` |
| `{{mm}}` | 2-digit minutes | `30` |
| `{{ss}}` | 2-digit seconds | `05` |

Tokens can be combined freely inside a single `{{ }}`:

```
{{YYYY-MM-DD}}  →  2026-04-15
{{YYYY/MM/DD}}  →  2026/04/15
{{HH:mm:ss}}    →  09:30:05
```

### Note Title

| Token | Description |
|---|---|
| `{{title}}` | Note title entered by the user |

### Counter (filename format only)

Used to auto-number files when duplicates exist.

| Token | Description | Output example |
|---|---|---|
| `{{N}}` | No padding | `1`, `2`, `3`… |
| `{{0N}}` | 2-digit zero-padded | `01`, `02`… |
| `{{00N}}` | 3-digit zero-padded | `001`, `002`… |

> Add more leading zeros to increase the output width: `{{000N}}` → `0001`, `0002`…

### Template Folder Hierarchy

> This rule applies to **template folder names only**, not to filename format strings.

The folder containing a template can define a target sub-directory for the created note.  
Within the folder name, `.` is treated as a path separator:

| Template folder | Example (2026-04-15) |
|---|---|
| `{{YYYY}}.{{YYYY-MM}}.{{YYYY-MM-DD}}` | `notes/2026/2026-04/2026-04-15/` |
| `{{YYYY}}.{{MM}}` | `notes/2026/04/` |
| `archive.{{YYYY}}` | `notes/archive/2026/` |

To include a literal `.` in a folder name without splitting, use `{{.}}`:

```
v1{{.}}0  →  notes/v1.0/
```

When templates are stored in nested sub-folders inside the templates directory, that folder hierarchy is preserved as-is and combined with the `.` expansion:

| Templates directory structure | Example (2026-04-15) |
|---|---|
| `.templates/diary/{{YYYY}}.{{MM}}/` | `notes/diary/2026/04/` |
| `.templates/work/{{YYYY}}.{{MM}}.{{DD}}/` | `notes/work/2026/04/15/` |
| `.templates/archive/{{YYYY}}/` | `notes/archive/2026/` |

## Contributing

If you'd like to contribute to GroveNotes, please fork the repository and submit a pull request. Contributions of all kinds are welcome, including bug fixes, new features, documentation improvements, and more.

- [GitHub - yuyosy/vscode-grove-notes](https://github.com/yuyosy/vscode-grove-notes)

## Behind the Name

“Grove” comes from a small group of trees — a place where things grow together.

GroveNotes is built around that idea: your notes, structured and growing in a tree.

As a nice coincidence, Jujutsu uses a bird as its icon — and it turns out, birds fit quite naturally in a grove. 🌳🕊️

Notes grow on trees, and sometimes, they even have version control.


## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
