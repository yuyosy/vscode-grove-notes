import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getNotePath } from '../config';
import { Commands as Cmd } from '../contributions/commands';

export async function newFolder(parentPath?: string): Promise<void> {
  const notePath = getNotePath();
  if (!notePath) {
    const choice = await vscode.window.showWarningMessage(
      'Notes folder is not configured. Run "Notes: Setup Notes Folder" first.',
      'Setup Now',
    );
    if (choice === 'Setup Now') {
      await vscode.commands.executeCommand(Cmd.Setup);
    }
    return;
  }

  const baseDir = parentPath ?? notePath;
  const folderName = await vscode.window.showInputBox({
    prompt: 'New folder name',
    validateInput: (value) => {
      const trimmed = value.trim();
      if (!trimmed) return 'Name cannot be empty';
      if (/[\\/]/.test(trimmed))
        return 'Folder name cannot contain path separators';
      if (/[<>:"|?*\0]/.test(trimmed))
        return 'Name contains invalid characters';
      if (fs.existsSync(path.join(baseDir, trimmed))) {
        return 'A file or folder with that name already exists';
      }
      return null;
    },
  });

  if (!folderName) return;

  try {
    fs.mkdirSync(path.join(baseDir, folderName.trim()));
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `Create folder failed: ${(err as Error).message}`,
    );
    return;
  }

  void vscode.commands.executeCommand(Cmd.Refresh);
}
