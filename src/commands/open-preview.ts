import * as vscode from 'vscode';
import { getPreviewOpenToSide } from '../config';
import type { NoteTreeItem } from '../types';

export async function openPreview(item: {
  data: NoteTreeItem;
}): Promise<vscode.Uri | undefined> {
  const fp = item?.data?.filePath;
  if (!fp) return;
  const cmd = getPreviewOpenToSide()
    ? 'markdown.showPreviewToSide'
    : 'markdown.showPreview';
  const uri = vscode.Uri.file(fp);
  await vscode.commands.executeCommand(cmd, uri);
  return uri;
}
