import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getUseJujutsu, setNotePath } from '../config';
import { isJjAvailable } from '../utils/jj-resolver';

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

  // Offer jj init if jj is enabled and .jj does not exist yet
  await maybeInitJj(notePath);
}

/**
 * Checks whether a jj repo exists in `folderPath`.
 * If not (and jj is enabled/available), offers to run `jj init`.
 */
export async function maybeInitJj(folderPath: string): Promise<void> {
  if (!getUseJujutsu() || !isJjAvailable()) return;

  const jjDir = path.join(folderPath, '.jj');
  if (fs.existsSync(jjDir)) return; // already initialised

  const answer = await vscode.window.showInformationMessage(
    'No Jujutsu repository found in the notes folder. Initialize one now?',
    'Yes, run jj init',
    'No',
  );
  if (answer !== 'Yes, run jj init') return;

  // Dynamic import to avoid circular dependency at module load time
  const { jjInit } = await import('./jj-operations');
  await jjInit(folderPath);
}
