import * as vscode from 'vscode';
import { getPreviewOpenToSide } from '../config';
import type { NoteTreeItem } from '../types';

export function openPreview(item: { data: NoteTreeItem }): void {
  const fp = item?.data?.filePath;
  if (!fp) return;
  const cmd = getPreviewOpenToSide()
    ? 'markdown.showPreviewToSide'
    : 'markdown.showPreview';
  vscode.commands.executeCommand(cmd, vscode.Uri.file(fp));
}
