import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Commands as Cmd } from '../contributions/commands';

export async function deleteItem(filePath: string): Promise<boolean> {
  if (!filePath) return false;

  let isDir: boolean;
  try {
    isDir = fs.statSync(filePath).isDirectory();
  } catch {
    vscode.window.showErrorMessage(`Cannot access: ${filePath}`);
    return false;
  }

  const label = path.basename(filePath);
  const kind = isDir ? 'folder' : 'file';

  const answer = await vscode.window.showWarningMessage(
    `Delete ${kind} "${label}"?`,
    { modal: true },
    'Delete',
  );
  if (answer !== 'Delete') return false;

  try {
    if (isDir) {
      fs.rmSync(filePath, { recursive: true });
    } else {
      fs.unlinkSync(filePath);
    }
    vscode.commands.executeCommand(Cmd.Refresh);
    return true;
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `Failed to delete "${label}": ${(err as Error).message}`,
    );
    return false;
  }
}
