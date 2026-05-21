import * as vscode from 'vscode';
import {
  getNotePath,
  getPathSeparatorOption,
  getUseGitignore,
} from '../config';
import {
  getMtime,
  getRelativeDisplayPath,
  SYSTEM_IGNORE_PATTERNS,
  walkDir,
} from '../utils/file-utils';
import { readGitignorePatterns } from '../utils/gitignore-utils';

const LIST_LIMIT = 50;
type NoteQuickPickItem = vscode.QuickPickItem & { filePath: string };

export async function listNotes(): Promise<void> {
  const notePath = getNotePath();
  if (!notePath) {
    vscode.window.showWarningMessage('Notes folder is not configured.');
    return;
  }

  const gitignorePatterns = getUseGitignore()
    ? readGitignorePatterns(notePath)
    : [];
  const scanPatterns = [
    ...new Set([...SYSTEM_IGNORE_PATTERNS, ...gitignorePatterns]),
  ];
  const files = walkDir(notePath, scanPatterns)
    .sort((a, b) => getMtime(b) - getMtime(a))
    .slice(0, LIST_LIMIT);

  if (files.length === 0) {
    vscode.window.showInformationMessage('No notes found.');
    return;
  }

  const separatorOption = getPathSeparatorOption();
  const items: NoteQuickPickItem[] = files.map((f) => ({
    label: getRelativeDisplayPath(notePath, f, separatorOption),
    description: new Date(getMtime(f)).toLocaleString(),
    filePath: f,
  }));

  const selection = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a note to open',
    matchOnDescription: true,
  });

  if (!selection) return;

  const doc = await vscode.workspace.openTextDocument(selection.filePath);
  await vscode.window.showTextDocument(doc);
}
