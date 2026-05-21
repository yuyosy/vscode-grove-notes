import * as vscode from 'vscode';
import { getPathSeparatorOption } from '../config';
import type { NoteTreeItem } from '../types';
import { normalizePathSeparators } from '../utils/file-utils';

export function copyPath(item: { data: NoteTreeItem }): void {
  const fp = item?.data?.filePath;
  if (!fp) return;
  const normalized = normalizePathSeparators(fp, getPathSeparatorOption());
  vscode.env.clipboard.writeText(normalized);
}
