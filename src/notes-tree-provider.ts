import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getJjModifiedFiles } from './commands/jj-operations';
import {
  getEnableTagsInView,
  getHideIgnoreFilesInTagsView,
  getNotePath,
  getPathSeparatorOption,
  getUseGitignore,
  getUseJujutsu,
  getViewHiddenPatterns,
} from './config';
import type { NoteTreeItem } from './types';
import {
  getRelativeDisplayPath,
  readDirEntries,
  SYSTEM_IGNORE_PATTERNS,
} from './utils/file-utils';
import { isJjAvailable } from './utils/jj-resolver';
import { buildTagIndex } from './utils/tag-index';

export class NotesTreeItem extends vscode.TreeItem {
  constructor(
    public readonly data: NoteTreeItem,
    collapsibleState: vscode.TreeItemCollapsibleState,
    modifiedFiles?: Set<string>,
  ) {
    super(data.label, collapsibleState);

    if (data.kind === 'file' && data.filePath) {
      this.resourceUri = vscode.Uri.file(data.filePath);
      this.command = {
        command: 'vscode.open',
        title: 'Open Note',
        arguments: [vscode.Uri.file(data.filePath)],
      };
      const isModified = modifiedFiles?.has(data.filePath) ?? false;
      this.contextValue = isModified ? 'noteFileModified' : 'noteFile';
    } else if (data.kind === 'dir') {
      this.contextValue = 'noteDir';
      this.iconPath = new vscode.ThemeIcon('folder');
    } else if (data.kind === 'rootFile') {
      this.iconPath = new vscode.ThemeIcon('files');
      this.contextValue = 'rootFile';
    } else if (data.kind === 'rootTag') {
      this.iconPath = new vscode.ThemeIcon('tag');
      this.contextValue = 'rootTag';
    } else if (data.kind === 'tag') {
      this.iconPath = new vscode.ThemeIcon('tag');
      this.contextValue = 'noteTag';
    }
  }
}

export class NotesTreeProvider
  implements
    vscode.TreeDataProvider<NotesTreeItem>,
    vscode.TreeDragAndDropController<NotesTreeItem>
{
  readonly dragMimeTypes = ['application/vnd.code.tree.notesView'];
  readonly dropMimeTypes = ['application/vnd.code.tree.notesView'];

  private _onDidChangeTreeData = new vscode.EventEmitter<
    // biome-ignore lint/suspicious/noConfusingVoidType: required by vscode.TreeDataProvider
    NotesTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _modifiedFilesCache: Set<string> = new Set();

  refresh(): void {
    // Refresh the modified-files cache once per cycle so getChildren reuses it
    const notePath = getNotePath();
    this._modifiedFilesCache =
      notePath && getUseJujutsu() && isJjAvailable()
        ? getJjModifiedFiles(notePath)
        : new Set();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: NotesTreeItem): vscode.TreeItem {
    return element;
  }

  async handleDrag(
    source: readonly NotesTreeItem[],
    dataTransfer: vscode.DataTransfer,
  ): Promise<void> {
    const draggableItems = source
      .filter((item) => item.data.kind === 'file' || item.data.kind === 'dir')
      .map((item) => item.data.filePath)
      .filter((filePath): filePath is string => !!filePath);

    if (draggableItems.length === 0) return;

    dataTransfer.set(
      'application/vnd.code.tree.notesView',
      new vscode.DataTransferItem(JSON.stringify(draggableItems)),
    );
  }

  async handleDrop(
    target: NotesTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
  ): Promise<void> {
    const notePath = getNotePath();
    if (!notePath) return;

    const destinationDir = this._resolveDropDirectory(target, notePath);
    if (!destinationDir) return;

    const transferItem = dataTransfer.get(
      'application/vnd.code.tree.notesView',
    );
    const serialized = transferItem ? await transferItem.asString() : '';
    if (!serialized) return;

    let sourcePaths: string[];
    try {
      sourcePaths = JSON.parse(serialized) as string[];
    } catch {
      return;
    }

    const uniquePaths = [...new Set(sourcePaths)];
    const movePlan: Array<{ sourcePath: string; destinationPath: string }> = [];

    for (const sourcePath of uniquePaths) {
      if (!this._isMovablePath(sourcePath, notePath)) {
        vscode.window.showWarningMessage(
          'Only items inside the notes folder can be moved.',
        );
        return;
      }

      const destinationPath = path.join(
        destinationDir,
        path.basename(sourcePath),
      );
      const validationMessage = this._validateMove(
        sourcePath,
        destinationDir,
        destinationPath,
      );
      if (validationMessage) {
        vscode.window.showWarningMessage(validationMessage);
        return;
      }

      movePlan.push({ sourcePath, destinationPath });
    }

    for (const { sourcePath, destinationPath } of movePlan) {
      try {
        await vscode.workspace.fs.rename(
          vscode.Uri.file(sourcePath),
          vscode.Uri.file(destinationPath),
          { overwrite: false },
        );
      } catch (err: unknown) {
        vscode.window.showErrorMessage(
          `Move failed: ${(err as Error).message}`,
        );
        return;
      }
    }

    this.refresh();
  }

  getChildren(element?: NotesTreeItem): vscode.ProviderResult<NotesTreeItem[]> {
    if (!element) {
      // Return empty array when no folder is set — triggers the viewsWelcome content
      if (!getNotePath()) return [];
      return this._getRoots();
    }

    const { kind } = element.data;

    if (kind === 'rootFile') {
      const notePath = getNotePath();
      if (!notePath) return [];
      return this._getDirChildren(notePath, this._modifiedFilesCache);
    }

    if (kind === 'dir' && element.data.filePath) {
      return this._getDirChildren(
        element.data.filePath,
        this._modifiedFilesCache,
      );
    }

    if (getEnableTagsInView()) {
      if (kind === 'rootTag') {
        return this._getTagNodes();
      }

      if (kind === 'tag' && element.data.files) {
        return element.data.files.map((f) =>
          this._makeFileItem(f, this._modifiedFilesCache),
        );
      }
    }

    return [];
  }

  private _getRoots(): NotesTreeItem[] {
    const roots: NotesTreeItem[] = [
      new NotesTreeItem(
        { kind: 'rootFile', label: 'Files' },
        vscode.TreeItemCollapsibleState.Expanded,
      ),
    ];

    if (getEnableTagsInView()) {
      roots.push(
        new NotesTreeItem(
          { kind: 'rootTag', label: 'Tags' },
          vscode.TreeItemCollapsibleState.Collapsed,
        ),
      );
    }

    return roots;
  }

  private _getDirChildren(
    dirPath: string,
    modifiedFiles: Set<string>,
  ): NotesTreeItem[] {
    const notePath = getNotePath();
    const hiddenPatterns = getViewHiddenPatterns();
    const viewPatterns = [
      ...new Set([...SYSTEM_IGNORE_PATTERNS, ...hiddenPatterns]),
    ];
    const entries = readDirEntries(
      dirPath,
      viewPatterns,
      notePath || dirPath,
      getUseGitignore(),
    );

    // Directories first, then files, each sorted alphabetically
    const dirs = entries.filter((e) => e.isDirectory);
    const files = entries.filter((e) => !e.isDirectory);

    const result: NotesTreeItem[] = [];

    for (const d of dirs) {
      result.push(
        new NotesTreeItem(
          { kind: 'dir', label: d.name, filePath: d.fullPath },
          vscode.TreeItemCollapsibleState.Collapsed,
        ),
      );
    }

    for (const f of files) {
      result.push(
        this._makeFileItem(
          { kind: 'file', label: f.name, filePath: f.fullPath },
          modifiedFiles,
        ),
      );
    }

    return result;
  }

  private _makeFileItem(
    data: NoteTreeItem,
    modifiedFiles?: Set<string>,
  ): NotesTreeItem {
    return new NotesTreeItem(
      data,
      vscode.TreeItemCollapsibleState.None,
      modifiedFiles,
    );
  }

  private _getTagNodes(): NotesTreeItem[] {
    const notePath = getNotePath();
    if (!notePath) return [];

    const scanPatterns = [...SYSTEM_IGNORE_PATTERNS];
    if (getHideIgnoreFilesInTagsView()) {
      scanPatterns.push(...getViewHiddenPatterns());
    }
    const tagIndex = buildTagIndex(notePath, scanPatterns, getUseGitignore());
    const sortedTags = Object.keys(tagIndex).sort();
    const separatorOption = getPathSeparatorOption();

    return sortedTags.map((tag) => {
      const fileItems: NoteTreeItem[] = tagIndex[tag].map((fp) => ({
        kind: 'file' as const,
        label: getRelativeDisplayPath(notePath, fp, separatorOption),
        filePath: fp,
      }));

      return new NotesTreeItem(
        { kind: 'tag', label: tag, files: fileItems },
        vscode.TreeItemCollapsibleState.Collapsed,
      );
    });
  }

  private _resolveDropDirectory(
    target: NotesTreeItem | undefined,
    notePath: string,
  ): string | undefined {
    if (!target || target.data.kind === 'rootFile') return notePath;
    if (target.data.kind === 'dir') return target.data.filePath;
    return undefined;
  }

  private _isMovablePath(filePath: string, notePath: string): boolean {
    const relativePath = path.relative(notePath, filePath);
    return relativePath !== '' && !relativePath.startsWith('..');
  }

  private _validateMove(
    sourcePath: string,
    destinationDir: string,
    destinationPath: string,
  ): string | undefined {
    const sourceDir = path.dirname(sourcePath);
    if (sourceDir === destinationDir) {
      return 'Item is already in that folder.';
    }

    if (fs.existsSync(destinationPath)) {
      return 'A file or folder with the same name already exists in the destination.';
    }

    if (fs.existsSync(sourcePath) && fs.statSync(sourcePath).isDirectory()) {
      const relativePath = path.relative(sourcePath, destinationDir);
      if (relativePath === '' || !relativePath.startsWith('..')) {
        return 'A folder cannot be moved into itself.';
      }
    }

    return undefined;
  }
}
