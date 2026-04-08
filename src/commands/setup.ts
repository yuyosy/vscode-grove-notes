import * as vscode from 'vscode';
import { setNotePath } from '../config';

export async function setupNotes(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'Notes: Select the folder where your notes will be stored.',
    'Select Folder',
    'Cancel',
  );
  if (choice !== 'Select Folder') return;

  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Select Notes Folder',
  });

  if (!uris || uris.length === 0) return;

  const notePath = uris[0].fsPath;
  await setNotePath(notePath);

  vscode.window.showInformationMessage(`Notes folder set to: ${notePath}`);
}
