import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Commands } from '../contributions/commands';

/**
 * Renames a file or directory inside the notes folder.
 * Receives the absolute path of the item to rename.
 */
export async function renameItem(itemPath: string): Promise<void> {
  const isDir = fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory();
  const dir = path.dirname(itemPath);
  const oldName = path.basename(itemPath);
  const ext = isDir ? '' : path.extname(oldName);
  const baseName = isDir ? oldName : path.basename(oldName, ext);

  const newBaseName = await vscode.window.showInputBox({
    prompt: isDir ? 'New folder name' : 'New file name (without extension)',
    value: baseName,
    validateInput: (v) => {
      if (!v.trim()) return 'Name cannot be empty';
      if (/[<>:"|?*\0]/.test(v)) return 'Name contains invalid characters';
      const candidate = path.join(dir, isDir ? v.trim() : `${v.trim()}${ext}`);
      if (candidate !== itemPath && fs.existsSync(candidate)) {
        return 'A file or folder with that name already exists';
      }
      return null;
    },
  });

  if (!newBaseName || newBaseName.trim() === baseName) return;

  const newName = isDir ? newBaseName.trim() : `${newBaseName.trim()}${ext}`;
  const newPath = path.join(dir, newName);

  try {
    fs.renameSync(itemPath, newPath);
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`Rename failed: ${(err as Error).message}`);
    return;
  }

  // If the renamed file was open in the editor, reopen it at the new path
  const openDoc = vscode.workspace.textDocuments.find(
    (d) => d.uri.fsPath === itemPath,
  );
  if (openDoc) {
    await vscode.window.showTextDocument(vscode.Uri.file(newPath));
    await vscode.commands.executeCommand('workbench.action.closeOtherEditors');
  }

  vscode.commands.executeCommand(Commands.Refresh);
}
