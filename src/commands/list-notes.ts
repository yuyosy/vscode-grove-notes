import * as path from 'node:path';
import * as vscode from 'vscode';
import { getNotePath, getUseGitignore } from '../config';
import { getMtime, SYSTEM_IGNORE_PATTERNS, walkDir } from '../utils/file-utils';
import { readGitignorePatterns } from '../utils/gitignore-utils';

const LIST_LIMIT = 50;

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

  const items: vscode.QuickPickItem[] = files.map((f) => ({
    label: path.relative(notePath, f),
    description: new Date(getMtime(f)).toLocaleString(),
  }));

  const selection = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a note to open',
    matchOnDescription: true,
  });

  if (!selection) return;

  const filePath = path.join(notePath, selection.label);
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}
