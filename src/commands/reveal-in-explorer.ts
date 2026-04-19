import * as vscode from 'vscode';
import type { NoteTreeItem } from '../types';

export function revealInExplorer(item: { data: NoteTreeItem }): void {
  const fp = item?.data?.filePath;
  if (fp) {
    vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(fp));
  }
}
