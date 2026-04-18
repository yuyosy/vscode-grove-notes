import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getJjInitMode, getUseJujutsu, setNotePath } from '../config';
import { isJjAvailable } from '../utils/jj-resolver';

export async function setupNotes(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'Notes: Select the folder where your notes will be stored.',
    'Select Folder',
    'Cancel',
  );
  if (choice !== 'Select Folder') return;

  await selectNotesFolder();
}

/**
 * Directly opens a folder picker and sets the notes path.
 * Use this when the user has already expressed intent (e.g. Welcome button).
 */
export async function selectNotesFolder(): Promise<void> {
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
 * If not (and jj is enabled/available), offers to run `jj init`
 * according to the `versionControl.jjInitMode` setting.
 *
 *   never    – do nothing
 *   always   – init without asking
 *   ask      – always show a confirmation dialog
 *   askIfGit – show dialog only when .git is present; skip otherwise
 *   autoAsk  – auto-init when no .git; show dialog when .git is present
 */
export async function maybeInitJj(folderPath: string): Promise<void> {
  if (!getUseJujutsu() || !isJjAvailable()) return;

  const jjDir = path.join(folderPath, '.jj');
  if (fs.existsSync(jjDir)) return; // already initialised

  const mode = getJjInitMode();
  if (mode === 'never') return;

  const gitExists = fs.existsSync(path.join(folderPath, '.git'));
  const { jjInit } = await import('./jj-operations');

  if (mode === 'always') {
    await jjInit(folderPath);
    return;
  }

  if (mode === 'autoAsk' && !gitExists) {
    await jjInit(folderPath);
    return;
  }

  if (mode === 'askIfGit' && !gitExists) return;

  // Reach here for: ask (always), askIfGit (git exists), autoAsk (git exists)
  const detail = gitExists
    ? 'A .git repository was detected. jj will be initialized in colocated mode (jj git init --colocate).'
    : 'jj will be initialized in the notes folder.';

  const answer = await vscode.window.showInformationMessage(
    'No Jujutsu repository found in the notes folder. Initialize one now?',
    { detail, modal: false },
    'Yes',
    'No',
  );
  if (answer !== 'Yes') return;

  await jjInit(folderPath);
}
