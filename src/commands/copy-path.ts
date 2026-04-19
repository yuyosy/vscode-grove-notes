import * as path from 'node:path';
import * as vscode from 'vscode';
import type { NoteTreeItem } from '../types';

export function copyPath(item: { data: NoteTreeItem }): void {
  const fp = item?.data?.filePath;
  if (!fp) return;
  const sep = vscode.workspace
    .getConfiguration('explorer')
    .get<string>('copyPathSeparator', path.sep);
  const normalized =
    sep === '/' ? fp.replace(/\\/g, '/') : fp.replace(/\//g, '\\');
  vscode.env.clipboard.writeText(normalized);
}
