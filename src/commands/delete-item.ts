import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Commands as Cmd } from '../contributions/commands';

export async function deleteItem(filePath: string): Promise<void> {
  if (!filePath) return;

  let isDir: boolean;
  try {
    isDir = fs.statSync(filePath).isDirectory();
  } catch {
    vscode.window.showErrorMessage(`Cannot access: ${filePath}`);
    return;
  }

  const label = path.basename(filePath);
  const kind = isDir ? 'folder' : 'file';

  const answer = await vscode.window.showWarningMessage(
    `Delete ${kind} "${label}"?`,
    { modal: true },
    'Delete',
  );
  if (answer !== 'Delete') return;

  try {
    if (isDir) {
      fs.rmSync(filePath, { recursive: true });
    } else {
      fs.unlinkSync(filePath);
    }
    vscode.commands.executeCommand(Cmd.Refresh);
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `Failed to delete "${label}": ${(err as Error).message}`,
    );
  }
}
