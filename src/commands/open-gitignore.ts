import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getNotePath } from '../config';

/**
 * Opens the `.gitignore` file in the notes folder.
 * Creates an empty one if it does not exist yet.
 */
export async function openGitignore(): Promise<void> {
  const notePath = getNotePath();
  if (!notePath) {
    vscode.window.showWarningMessage('Notes folder is not configured.');
    return;
  }

  const gitignorePath = path.join(notePath, '.gitignore');

  // Create the file if it doesn't exist
  if (!fs.existsSync(gitignorePath)) {
    const template = [
      '# Notes extension — patterns listed here are excluded from the Notes view,',
      '# tag scans, and recent notes list when "Notes: Use .gitignore" is enabled.',
      '# Supports glob syntax. Negation patterns (!) are not supported by the extension.',
      '#',
      '# Examples:',
      '#   *.log',
      '#   _archive/**',
      '#   .templates',
      '',
    ].join('\n');
    try {
      fs.writeFileSync(gitignorePath, template);
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to create .gitignore: ${err}`);
      return;
    }
  }

  const doc = await vscode.workspace.openTextDocument(gitignorePath);
  await vscode.window.showTextDocument(doc);
}
