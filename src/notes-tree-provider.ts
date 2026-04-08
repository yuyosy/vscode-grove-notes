import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getIgnorePatterns, getNotePath } from './config';
import type { NoteTreeItem, TagIndex } from './types';
import { readDirEntries, walkDir } from './utils/file-utils';
import { parseFrontMatter } from './utils/front-matter';

export class NotesTreeItem extends vscode.TreeItem {
  constructor(
    public readonly data: NoteTreeItem,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(data.label, collapsibleState);

    if (data.kind === 'file' && data.filePath) {
      this.resourceUri = vscode.Uri.file(data.filePath);
      this.command = {
        command: 'vscode.open',
        title: 'Open Note',
        arguments: [vscode.Uri.file(data.filePath)],
      };
      this.contextValue = 'noteFile';
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
  implements vscode.TreeDataProvider<NotesTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    // biome-ignore lint/suspicious/noConfusingVoidType: required by vscode.TreeDataProvider
    NotesTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: NotesTreeItem): vscode.TreeItem {
    return element;
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
      return this._getDirChildren(notePath);
    }

    if (kind === 'dir' && element.data.filePath) {
      return this._getDirChildren(element.data.filePath);
    }

    if (kind === 'rootTag') {
      return this._getTagNodes();
    }

    if (kind === 'tag' && element.data.files) {
      return element.data.files.map((f) => this._makeFileItem(f));
    }

    return [];
  }

  private _getRoots(): NotesTreeItem[] {
    return [
      new NotesTreeItem(
        { kind: 'rootFile', label: 'Files' },
        vscode.TreeItemCollapsibleState.Expanded,
      ),
      new NotesTreeItem(
        { kind: 'rootTag', label: 'Tags' },
        vscode.TreeItemCollapsibleState.Collapsed,
      ),
    ];
  }

  private _getDirChildren(dirPath: string): NotesTreeItem[] {
    const ignorePatterns = getIgnorePatterns();
    const entries = readDirEntries(dirPath, ignorePatterns);

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
        this._makeFileItem({
          kind: 'file',
          label: f.name,
          filePath: f.fullPath,
        }),
      );
    }

    return result;
  }

  private _makeFileItem(data: NoteTreeItem): NotesTreeItem {
    return new NotesTreeItem(data, vscode.TreeItemCollapsibleState.None);
  }

  private _getTagNodes(): NotesTreeItem[] {
    const notePath = getNotePath();
    if (!notePath) return [];

    const ignorePatterns = getIgnorePatterns();
    const tagIndex = this._buildTagIndex(notePath, ignorePatterns);
    const sortedTags = Object.keys(tagIndex).sort();

    return sortedTags.map((tag) => {
      const fileItems: NoteTreeItem[] = tagIndex[tag].map((fp) => ({
        kind: 'file' as const,
        label: path.relative(notePath, fp),
        filePath: fp,
      }));

      return new NotesTreeItem(
        { kind: 'tag', label: tag, files: fileItems },
        vscode.TreeItemCollapsibleState.Collapsed,
      );
    });
  }

  private _buildTagIndex(notePath: string, ignorePatterns: string[]): TagIndex {
    const files = walkDir(notePath, ignorePatterns).filter((f) =>
      f.endsWith('.md'),
    );
    const index: TagIndex = {};

    for (const file of files) {
      let text: string;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const fm = parseFrontMatter(text);
      if (!fm || fm.tags.length === 0) continue;
      for (const tag of fm.tags) {
        if (!index[tag]) index[tag] = [];
        index[tag].push(file);
      }
    }

    return index;
  }
}
